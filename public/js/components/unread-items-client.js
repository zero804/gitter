"use strict";
var _ = require('underscore');
var context = require('utils/context');
var realtime = require('./realtime');
var apiClient = require('./apiClient');
var log = require('utils/log');
var Backbone = require('backbone');
var appEvents = require('utils/appevents');

module.exports = (function() {


  function limit(fn, context, timeout) {
    return _.throttle(fn.bind(context), timeout || 30, { leading: false });
  }

  function _iteratePreload(incoming, fn, context) {
    var chats = incoming.chat;      // This is done this way to keep protocol compatibility
    var mentions = incoming.mention;

    var items = {};
    if (chats) {
      chats.forEach(function(itemId) {
        items[itemId] = false;
      });
    }
    if (mentions) {
      mentions.forEach(function(itemId) {
        items[itemId] = true;
      });
    }

    Object.keys(items).forEach(function(itemId) {
      var mentioned = items[itemId];
      fn.call(context, itemId, mentioned);
    });

  }

  function onceUserIdSet(callback, c) {
    var user = context.user();

    if(user.id) {
      callback.call(c, user.id);
    } else {
      user.once('change:id', function() {
        callback.call(c, user.id);
      });
    }
  }

  var ADD_TIMEOUT = 500;
  var REMOVE_TIMEOUT = 600000; // 10 minutes

  //
  // // -----------------------------------------------------
  // // A doublehash which slows things down
  // // -----------------------------------------------------
  //
  // var Tarpit = function(timeout, onDequeue) {
  //   DoubleHash.call(this);
  //   this._timeout = timeout;
  //   this._onDequeue = onDequeue;
  // };
  //
  // _.extend(Tarpit.prototype, DoubleHash.prototype, {
  //   _onItemAdded: function(itemType, itemId) {
  //     var self = this;
  //     window.setTimeout(function() {
  //       self._promote(itemType, itemId);
  //     }, this._timeout);
  //   },
  //
  //   _promote: function(itemType, itemId) {
  //     // Has this item already been deleted?
  //     if(!this._contains(itemType, itemId)) return;
  //
  //     this._remove(itemType, itemId);
  //     if(this._onDequeue) this._onDequeue(itemType, itemId);
  //   }
  // });

  // -----------------------------------------------------
  // The main component of the unread-items-store
  // Events:
  // * newcountvalue: (length)
  // * unreadItemRemoved: (itemId)
  // * change:status: (itemId, mention)
  // * itemMarkedRead: (itemId)
  // * add (itemId, mention)
  // -----------------------------------------------------
  var UnreadItemStore = function() {
    this.length = 0;
    this._lurkMode = false;
    this._items = {};
    //
    // this._maxItems = 100;
    // this._lurkMode = false;
    //
    // this._addTarpit = new Tarpit(ADD_TIMEOUT, _.bind(this._promote, this));
    // this._deleteTarpit = new Tarpit(REMOVE_TIMEOUT);
    this.notifyCountLimited = limit(this.notifyCount, this, 30);
    // this._currentCountValue = undefined;
  };

  _.extend(UnreadItemStore.prototype, Backbone.Events, {
    _unreadItemAdded: function(itemId, mention) {
      if (arguments.length !== 2) throw new Error(); // TODO: remove

      // Three options here:
      // 1 - new item
      // 2 - item exists and has the same mention status as before (nullop)
      // 3 - item exists and has a different mention status to before

      if (!this._items.hasOwnProperty(itemId)) {
        // Case 1
        this._items[itemId] = mention;
        this.length++;
        this.notifyCountLimited();

        this.trigger('add', itemId, mention);
      } else {
        if (this._items[itemId] === mention) {
          // Case 2
          return;
        }

        // Case 3
        this._items[itemId] = mention;
        this.trigger('change:status', itemId, mention);
      }
    },

    _unreadItemRemoved: function(itemId) {
      if (arguments.length !== 1) throw new Error(); // TODO: remove

      if (!this._items.hasOwnProperty(itemId)) return; // Does not exist

      delete this._items[itemId];
      this.length--;
      this.notifyCountLimited();

      this.trigger('unreadItemRemoved', itemId);
    },

    _markItemRead: function(itemId) {
      if (arguments.length !== 1) throw new Error(); // TODO: remove

      if (!this._items.hasOwnProperty(itemId)) return; // Does not exist
      var mentioned = this._items[itemId];

      delete this._items[itemId];
      this.length--;
      this.notifyCountLimited();

      if(this._lurkMode && !mentioned) {
        // Lurk mode, but no mention, don't mark as read
        return;
      }

      this.trigger('itemMarkedRead', itemId);
    },

    // via Realtime
    _unreadItemsAdded: function(items) {
      if (arguments.length !== 1) throw new Error(); // TODO: remove

      _iteratePreload(items, function(itemId, mention) {
        this._unreadItemAdded(itemId, mention);
      }, this);
    },

    // via Realtime
    _unreadItemsRemoved: function(items) {
      if (arguments.length !== 1) throw new Error(); // TODO: remove

      // TODO: XXX handle mention changes

      _iteratePreload(items, function(itemId) {
        this._unreadItemRemoved(itemId);
      }, this);
    },

    notifyCount: function() {
      this.trigger('newcountvalue', this.length);
      appEvents.trigger('unreadItemsCount', this.length);
    },

    getItems: function() {
      return Object.keys(this._items);
    },

    enableLurkMode: function() {
      if (arguments.length !== 0) throw new Error(); // TODO: remove

      this._lurkMode = true;

      Object.keys(this._items).forEach(function(itemId) {
        // Notify that all are read
        this.trigger('itemMarkedRead', itemId);
      }, this);

      this._items = {};
      this.length = 0;
      this.notifyCountLimited();
    },

    disableLurkMode: function() {
      if (arguments.length !== 0) throw new Error(); // TODO: remove

      this._lurkMode = false;
    },

    markAllReadNotification: function() {
      if (arguments.length !== 0) throw new Error(); // TODO: remove

      Object.keys(this._items).forEach(function(itemId) {
        // Notify that all are read
        this.trigger('itemMarkedRead', itemId);
      }, this);

      this._items = {};
      this.length = 0;
      this.notifyCountLimited();
    },

    markAllRead: function() {
      if (arguments.length !== 0) throw new Error(); // TODO: remove

      var self = this;
      onceUserIdSet(function() {
        apiClient.userRoom.delete("/unreadItems/all")
          .then(function() {
            self.markAllReadNotification();
          });
      }, self);

    },

    getFirstItem: function() {
      if (arguments.length !== 0) throw new Error(); // TODO: remove

      var items = Object.keys(this._items);
      return items.sort()[0]; // TODO: make this O(n) instead of (n log n)
    }
  });

  // -----------------------------------------------------
  // This component sends read notifications back to the server
  // -----------------------------------------------------

  var ReadItemSender = function(unreadItemStore) {
    this._buffer = {};
    this._sendLimited = limit(this._send, this, 1000);

    unreadItemStore.on('itemMarkedRead', this._onItemMarkedRead.bind(this));

    var bound = this._onWindowUnload.bind(this);
    ['unload', 'beforeunload'].forEach(function(e) {
      window.addEventListener(e, bound, false);
    });
  };

  ReadItemSender.prototype = {
    _onItemMarkedRead: function(itemId) {
      // All items marked as read are send back to the server
      // as chats
      this._buffer[itemId] = true;
      this._sendLimited();
    },

    _onWindowUnload: function() {
      if(Object.keys(this._buffer) > 0) {
        // This causes mainthread locks in Safari
        // TODO: send to the parent frame?
        this._send({ sync: true });
      }
    },

    _send: function(options) {
      onceUserIdSet(function() {
        var items = Object.keys(this._buffer);
        if (!items.length) return;

        var queue = { chat: items };
        this._buffer = {};

        var async = !options || !options.sync;
        var self = this;

        apiClient.userRoom.post('/unreadItems', queue, {
            async: async,
            global: false
          })
          .fail(function() {
            log.info('uic: Error posting unread items to server. Will attempt again in 5s');

            // Unable to send messages, requeue them and try again in 5s
            setTimeout(function() {
              items.forEach(function(itemId) {
                self._onItemMarkedRead(itemId);
              });
            }, 5000);
          });

      }, this);

    }
  };

  // -----------------------------------------------------
  // Sync unread items with realtime notifications coming from the server
  // -----------------------------------------------------

  var TroupeUnreadItemRealtimeSync = function(unreadItemStore) {
    this._store = unreadItemStore;
  };

  _.extend(TroupeUnreadItemRealtimeSync.prototype, Backbone.Events, {
    _subscribe: function() {
      onceUserIdSet(function(userId) {

        var store = this._store;

        var subscription = '/v1/user/' + userId + '/rooms/' + context.getTroupeId() + '/unreadItems';

        realtime.subscribe(subscription, function(message) {
          switch(message.notification) {
            // New unread items
            case 'unread_items':
              store._unreadItemsAdded(message.items);
              break;

            // Unread items removed
            case 'unread_items_removed':
              store._unreadItemsRemoved(message.items);
              break;

            // New unread items
            case 'mark_all_read':
              store.markAllReadNotification();
              break;

            // Lurk mode switched on/off
            case 'lurk_change':
              if(message.lurk) {
                store.enableLurkMode();
              } else {
                store.disableLurkMode();
              }
              break;
          }
        });

        realtime.registerForSnapshots(subscription, function(snapshot) {
          var lurk = snapshot._meta && snapshot._meta.lurk;
          if(lurk) {
            store.enableLurkMode();
          }

          store._unreadItemsAdded(snapshot);
        });

      }, this);
    }

  });

  // -----------------------------------------------------
  // Monitors the view port and tells the store when things
  // have been read
  // -----------------------------------------------------

  var TroupeUnreadItemsViewportMonitor = function(scrollElement, unreadItemStore, collectionView) {
    _.bindAll(this, '_getBounds');
    this._collectionView = collectionView;
    this._scrollElement = scrollElement[0] || scrollElement;

    this._store = unreadItemStore;
    this._windowScrollLimited = limit(this._windowScroll, this, 50);

    var foldCountLimited = limit(this._foldCount, this, 50);
    this._foldCountLimited = foldCountLimited;
    this._inFocus = true;

    appEvents.on('eyeballStateChange', this._eyeballStateChange, this);

    this._scrollElement.addEventListener('scroll', this._getBounds, false);

    // this is not a live collection so this will not work inside an SPA
    //$('.mobile-scroll-class').on('scroll', this._getBounds);

    appEvents.on('unreadItemDisplayed', this._getBounds);

    unreadItemStore.on('add', foldCountLimited);
    unreadItemStore.on('unreadItemRemoved', foldCountLimited);

    // When the UI changes, rescan
    // appEvents.on('appNavigation', this._getBounds);
    setTimeout(this._getBounds, 250);
  };

  TroupeUnreadItemsViewportMonitor.prototype = {
    _getBounds: function() {
      if(!this._inFocus) {
        this._foldCountLimited();
        return;
      }

      this._scrollBounds();

      this._windowScrollLimited();
    },

    /** Accumulate the scroll bounds, making them larger only */
    _scrollBounds: function() {
      var scrollTop = this._scrollElement.scrollTop;
      var scrollBottom = scrollTop + this._scrollElement.clientHeight;

      if(!this._scrollTop || scrollTop < this._scrollTop) {
        this._scrollTop = scrollTop;
      }

      if(!this._scrollBottom || scrollBottom > this._scrollBottom) {
        this._scrollBottom = scrollBottom;
      }
    },

    _windowScroll: function() {
      if(!this._inFocus) {
        return;
      }

      this._scrollBounds();

      var self = this;

      var topBound = this._scrollTop;
      var bottomBound = this._scrollBottom;

      delete this._scrollTop;
      delete this._scrollBottom;

      var modelsInRange = this.findModelsInViewport(topBound, bottomBound);
      modelsInRange.forEach(function(model) {
        if (!model.get('unread')) return;

        self._store._markItemRead(model.id);
      });

      // TODO: do we need to do this?
      this._foldCount();
    },

    /**
     *
     */
    findModelsInViewport: function(viewportTop, viewportBottom) {
      // Note: assuming the collectionView does not have a custom sort
      var cv = this._collectionView;

      var childCollection = cv.collection;
      var topIndex = _.sortedIndex(childCollection.models, viewportTop, function(model) {
        if(typeof model === 'number') return model;
        var view = cv.children.findByModelCid(model.cid);
        return view.el.offsetTop;
      }) + 1;

      var remainingChildren = childCollection.slice(topIndex);
      var bottomIndex = _.sortedIndex(remainingChildren, viewportBottom, function(model) {
        if(typeof model === 'number') return model;
        var view = cv.children.findByModelCid(model.cid);
        return view.el.offsetTop;
      });

      return remainingChildren.slice(0, bottomIndex);
    },

    _foldCount: function() {
      var chats = this._store.getItems();
      if(!chats.length) {
        // If there are no unread items, save the effort.
        acrossTheFoldModel.set({
          unreadAbove: 0,
          unreadBelow: 0,
          belowItemId: null,
          hasUnreadBelow: false,
          hasUnreadAbove: false
        });
        return;
      }

      var above = 0;
      var below = 0;

      var topBound = this._scrollElement.scrollTop;
      var bottomBound = topBound + this._scrollElement.clientHeight;

      var modelsInRange = this.findModelsInViewport(topBound, bottomBound);
      var first = modelsInRange[0];
      var last = modelsInRange[modelsInRange.length - 1];
      var firstItemId = first.id;
      var lastItemId = last.id;

      chats.forEach(function(itemId) {
        if(itemId < firstItemId) above++;
        if(itemId > lastItemId) below++;
      });

      acrossTheFoldModel.set({
        unreadAbove: above,
        unreadBelow: below,
        hasUnreadAbove: above > 0,
        hasUnreadBelow: below > 0,
        belowItemId: last.id
      });
    },
    _eyeballStateChange: function(newState) {
      this._inFocus = newState;
      if(newState) {
        this._getBounds();
      }
    }
  };

  function CollectionSync(store, collection) {
    /*
    // * newcountvalue: (length)
    // * unreadItemRemoved: (itemId)
    // * change:status: (itemId, mention)
    // * itemMarkedRead: (itemId)
    // * add (itemId, mention)
     */
    store.on('unreadItemRemoved', function(itemId) {
      collection.patch(itemId, { unread: false, mentioned: false });
    });

    store.on('itemMarkedRead', function(itemId) {
      collection.patch(itemId, { unread: false, mentioned: false });
    });

    store.on('change:status', function(itemId, mention) {
      collection.patch(itemId, { unread: true,  mentioned: mention });
    });

    store.on('add', function(itemId, mention) {
      collection.patch(itemId, { unread: true, mentioned: mention });
    });
  }


  var _unreadItemStore;

  /**
   * Returns an instance of the unread items store,
   * or throws an error if it's not obtainable
   */
  function getUnreadItemStore() {
    if(_unreadItemStore) return _unreadItemStore;

    // TODO: XXX: we'll need to come up with a new way of
    // figuring out if we're on a not-logged-in page
    if(context.troupe().id) {
      _unreadItemStore = new UnreadItemStore();
      new ReadItemSender(_unreadItemStore);
      var realtimeSync = new TroupeUnreadItemRealtimeSync(_unreadItemStore);
      realtimeSync._subscribe();
      // new ReadItemRemover(realtimeSync);

      return _unreadItemStore;
    }

    return null;

  }

  /**
   * Returns an instance of the unread items store,
   * or throws an error if it's not obtainable
   */
  function getUnreadItemStoreReq() {
    var store = getUnreadItemStore();
    if(store) return store;

    throw new Error("Unable to create an unread items store without a user");
  }

  var acrossTheFoldModel = new Backbone.Model({
    defaults: {
      unreadAbove: 0,
      unreadBelow: 0,
      hasUnreadBelow: false,
      hasUnreadAbove: false,
      belowItemId: null
    }
  });

  var unreadItemsClient = {
    acrossTheFold: function() {
      return acrossTheFoldModel;
    },
    //
    // hasItemBeenMarkedAsRead: function(itemType, itemId) {
    //   var unreadItemStore = getUnreadItemStoreReq();
    //
    //   if(!unreadItemStore) {
    //     return false;
    //   }
    //
    //   return unreadItemStore._hasItemBeenMarkedAsRead(itemType, itemId);
    // },

    markAllRead: function() {
      var unreadItemStore = getUnreadItemStoreReq();
      unreadItemStore.markAllRead();
    },

    syncCollections: function(collections) {
      var unreadItemStore = getUnreadItemStoreReq();
      new CollectionSync(unreadItemStore, collections.chat);

    },

    monitorViewForUnreadItems: function($el, collectionView) {
      var unreadItemStore = getUnreadItemStoreReq();
      return new TroupeUnreadItemsViewportMonitor($el, unreadItemStore, collectionView);
    },

    getFirstUnreadItem: function() {
      var unreadItemStore = getUnreadItemStoreReq();
      return unreadItemStore.getFirstItemOfType('chat');
    }
  };

  // Mainly useful for testing
  unreadItemsClient.getStore = function() { return _unreadItemStore; };
  unreadItemsClient.UnreadItemStore = UnreadItemStore;


  /* Expose */
  window._unreadItems = unreadItemsClient;

  return unreadItemsClient;

})();
