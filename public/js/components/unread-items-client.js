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

  // -----------------------------------------------------
  // The main component of the unread-items-store
  // Events:
  // * newcountvalue: (length)
  // * unreadItemRemoved: (itemId)
  // * change:status: (itemId, mention)
  // * itemMarkedRead: (itemId, mention, lurkMode)
  // * add (itemId, mention)
  // -----------------------------------------------------
  var UnreadItemStore = function() {
    this.length = 0;
    this._lurkMode = false;
    this._items = {};

    this.notifyCountLimited = limit(this.notifyCount, this, 30);
  };

  _.extend(UnreadItemStore.prototype, Backbone.Events, {
    _unreadItemAdded: function(itemId, mention) {
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
      if (!this._items.hasOwnProperty(itemId)) return; // Does not exist

      delete this._items[itemId];
      this.length--;
      this.notifyCountLimited();

      this.trigger('unreadItemRemoved', itemId);
    },

    _mentionRemoved: function(itemId) {
      if (!this._items.hasOwnProperty(itemId)) return; // Does not exist
      this._items[itemId] = false;
      this.notifyCountLimited();
      this.trigger('change:status', itemId, false);
    },

    _markItemRead: function(itemId) {
      var inStore = this._items.hasOwnProperty(itemId);
      var lurkMode = this._lurkMode;

      if (!inStore) {
        /* Special case for lurk mode, still send the itemMarkedAsRead event
         * so that the model gets updated (even though its not actually unread)
         */
        if (lurkMode) {
          this.trigger('itemMarkedRead', itemId, false, true);
        }
        return;
      }

      var mentioned = this._items[itemId];

      delete this._items[itemId];
      this.length--;
      this.notifyCountLimited();
      this.trigger('itemMarkedRead', itemId, mentioned, lurkMode);
    },

    // via Realtime
    _unreadItemsAdded: function(items) {
      _iteratePreload(items, function(itemId, mention) {
        this._unreadItemAdded(itemId, mention);
      }, this);
    },

    // via Realtime
    _unreadItemsRemoved: function(incoming) {
      function hashArray(array) {
        if (!array) return {};

        return array.reduce(function(memo, value) {
          memo[value] = true;
          return memo;
        }, {});
      }

      var chats = hashArray(incoming.chat);
      var mentions = hashArray(incoming.mention);
      var all = _.extend({}, chats, mentions);
      var self = this;
      Object.keys(all).forEach(function(itemId) {
        var removeChat = chats[itemId];

        if (removeChat) {
          self._unreadItemRemoved(itemId);
        } else {
          // remove mention from chat
          self._mentionRemoved(itemId);
        }
      });

    },

    notifyCount: function() {
      this.trigger('newcountvalue', this.length);
      appEvents.trigger('unreadItemsCount', this.length);
    },

    getItems: function() {
      return Object.keys(this._items);
    },

    getMentions: function() {
      return Object.keys(this._items).reduce(function(accum, itemId) {
        if (this._items[itemId]) accum.push(itemId);
        return accum;
      }.bind(this), []);
    },

    enableLurkMode: function() {
      this._lurkMode = true;
      this.markAllReadNotification();
    },

    disableLurkMode: function() {
      this._lurkMode = false;
    },

    markAllReadNotification: function() {
      Object.keys(this._items).forEach(function(itemId) {
        // Notify that all are read
        var mention = this._items[itemId];
        this.trigger('itemMarkedRead', itemId, mention, this._lurkMode);
      }, this);

      this._items = {};
      this.length = 0;
      this.notifyCountLimited();
    },

    markAllRead: function() {
      var self = this;
      onceUserIdSet(function() {
        apiClient.userRoom.delete("/unreadItems/all")
          .then(function() {
            self.markAllReadNotification();
          });
      }, self);

    },

    getFirstItem: function() {
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
    _onItemMarkedRead: function(itemId, mention, lurkMode) {
      // Don't sent unread items back to the server in lurk mode unless its a mention
      if (lurkMode && !mention) return;

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

      this._foldCount();
    },

    /**
     *
     */
    findModelsInViewport: function(viewportTop, viewportBottom) {
      // Note: assuming the collectionView does not have a custom sort
      var cv = this._collectionView;

      var childCollection = cv.collection;
      /* Get the children with models */

      /* TEMP TEMP TEMP TEMP TEMP */
      var models;
      if (childCollection.models.length === cv.children.length) {
        models = childCollection.models;
      } else {
        log.info("Mismatch between childCollection.models.length and cv.children.length resorting to oddness");

        models = childCollection.models.filter(function(model) {
          return cv.children.findByModelCid(model.cid);
        });
      }
      /* TEMP TEMP TEMP TEMP TEMP */

      var topIndex = _.sortedIndex(models, viewportTop, function(model) {
        if(typeof model === 'number') return model;
        var view = cv.children.findByModelCid(model.cid);
        return view.el.offsetTop;
      });

      var remainingChildren = models.slice(topIndex);
      if (viewportBottom === Number.POSITIVE_INFINITY) {
        /* Thats the whole lot */
        return remainingChildren;
      }

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
          hasUnreadBelow: false,
          hasUnreadAbove: false,
          oldestUnreadItemId: null,
          mostRecentUnreadItemId: null,

          mentionsAbove: 0,
          mentionsBelow: 0,
          hasMentionsAbove: false,
          hasMentionsBelow: false,
          oldestMentionId: null,
          mostRecentMentionId: null
        });
        return;
      }

      var above = 0;
      var below = 0;

      var mentionsAbove = 0;
      var mentionsBelow = 0;

      var topBound = this._scrollElement.scrollTop;
      var bottomBound = topBound + this._scrollElement.clientHeight;
      if (bottomBound >= this._scrollElement.scrollHeight - 10) {
        /* At the bottom? */
        bottomBound =  Number.POSITIVE_INFINITY;
      }

      var modelsInRange = this.findModelsInViewport(topBound, bottomBound);
      var first = modelsInRange[0];
      var last = modelsInRange[modelsInRange.length - 1];
      var firstItemId = first.id;
      var lastItemId = last.id;

      var oldestUnreadItemId = null;
      var mostRecentUnreadItemId = null;
      var oldestMentionId = null;
      var mostRecentMentionId = null;
      
      chats.forEach(function(itemId) {
        if (itemId < firstItemId) {
          above++;
          if (!oldestUnreadItemId) oldestUnreadItemId = itemId;
          if (this._store._items[itemId])  {
            mentionsAbove++;
            oldestMentionId = itemId;
          }
        }
        if (itemId > lastItemId) {
          below++;
          if (!mostRecentUnreadItemId) mostRecentUnreadItemId = itemId;
          if (this._store._items[itemId]) {
            mentionsBelow++;
            if (!mostRecentMentionId) mostRecentMentionId = itemId;
          }
        }
      }.bind(this));

      acrossTheFoldModel.set({
        unreadAbove: above,
        unreadBelow: below,
        hasUnreadAbove: above > 0,
        hasUnreadBelow: below > 0,
        oldestUnreadItemId: oldestUnreadItemId,
        mostRecentUnreadItemId: mostRecentUnreadItemId,

        mentionsAbove: mentionsAbove,
        mentionsBelow: mentionsBelow,
        hasMentionsAbove: mentionsAbove > 0,
        hasMentionsBelow: mentionsBelow > 0,
        oldestMentionId: oldestMentionId,
        mostRecentMentionId: mostRecentMentionId
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
    // * itemMarkedRead: (itemId, mention, lurkMode)
    // * add (itemId, mention)
     */
    store.on('unreadItemRemoved', function(itemId) {
      collection.patch(itemId, { unread: false, mentioned: false });
    });

    store.on('itemMarkedRead', function(itemId, mention) {
      collection.patch(itemId, { unread: false, mentioned: mention });
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
    },

    getFirstUnreadMention: function() {
      var unreadItemStore = getUnreadItemStoreReq();
      return unreadItemStore.getFirstItemOfType('mention');
    }

  };

  // Mainly useful for testing
  unreadItemsClient.getStore = function() { return _unreadItemStore; };
  unreadItemsClient.UnreadItemStore = UnreadItemStore;


  /* Expose */
  window._unreadItems = unreadItemsClient;

  return unreadItemsClient;

})();
