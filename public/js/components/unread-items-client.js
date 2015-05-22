"use strict";
var $ = require('jquery');
var _ = require('underscore');
var context = require('utils/context');
var realtime = require('./realtime');
var apiClient = require('./apiClient');
var log = require('utils/log');
var Backbone = require('backbone');
var appEvents = require('utils/appevents');
var dataset = require('utils/dataset-shim');
var DoubleHash = require('utils/double-hash');

module.exports = (function() {


  function limit(fn, context, timeout) {
    return _.throttle(fn.bind(context), timeout || 30, { leading: false });
  }

  function _iteratePreload(items, fn, context) {
    var keys = _.keys(items);
    _.each(keys, function(itemType) {
      // Ignore the meta
      if(itemType === '_meta') return;

      _.each(items[itemType], function(itemId) {
        fn.call(context, itemType, itemId);
      });
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
  var REMOVE_TIMEOUT = 600000;

  // -----------------------------------------------------
  // A doublehash which slows things down
  // -----------------------------------------------------

  var Tarpit = function(timeout, onDequeue) {
    DoubleHash.call(this);
    this._timeout = timeout;
    this._onDequeue = onDequeue;
  };

  _.extend(Tarpit.prototype, DoubleHash.prototype, {
    _onItemAdded: function(itemType, itemId) {
      var self = this;
      window.setTimeout(function() {
        self._promote(itemType, itemId);
      }, this._timeout);
    },

    _promote: function(itemType, itemId) {
      // Has this item already been deleted?
      if(!this._contains(itemType, itemId)) return;

      this._remove(itemType, itemId);
      if(this._onDequeue) this._onDequeue(itemType, itemId);
    }
  });

  // -----------------------------------------------------
  // The main component of the unread-items-store
  // -----------------------------------------------------

  var UnreadItemStore = function() {
    DoubleHash.call(this);

    this._maxItems = 100;
    this._lurkMode = false;

    this._addTarpit = new Tarpit(ADD_TIMEOUT, _.bind(this._promote, this));
    this._deleteTarpit = new Tarpit(REMOVE_TIMEOUT);
    this._recountLimited = limit(this._recount, this, 30);
    this._currentCountValue = undefined;
  };

  _.extend(UnreadItemStore.prototype, Backbone.Events, DoubleHash.prototype, {
    _unreadItemAdded: function(itemType, itemId) {
      if(this._deleteTarpit._contains(itemType, itemId)) {
        /**
         * Server is resending us the item, we probably need to tell it to mark it as
         * read a second time
         */
        this.trigger('itemMarkedRead', itemType, itemId/*, mentioned*/);
        return;
      }

      if(this._contains(itemType, itemId)) {
        return;
      }

      this._addTarpit._add(itemType, itemId);
      /* When the item is promoted, a recount will happen */
    },

    _unreadItemRemoved: function(itemType, itemId) {
      if(this._deleteTarpit._contains(itemType, itemId)) return;

      this._deleteTarpit._add(itemType, itemId);
      this._addTarpit._remove(itemType, itemId);
      this._remove(itemType, itemId);

      this.trigger('unreadItemRemoved', itemType, itemId);
      this._recountLimited();
    },

    _markItemRead: function(itemType, itemId, mentioned) {
      if(this._lurkMode && !mentioned) {
        // Lurk mode, but no mention, don't mark as read
        return;
      }

      this._unreadItemRemoved(itemType, itemId);
      this.trigger('itemMarkedRead', itemType, itemId, mentioned);
    },

    _onRemoveChild: function() {
      // Recount soon
      this._recountLimited();
    },

    _onItemAdded: function() {
      // Recount soon
      this._recountLimited();
    },

    _promote: function(itemType, itemId) {
      this._add(itemType, itemId);
      this.trigger('add', itemType, itemId);
    },

    _recount: function() {
      var newValue = this._count();
      this._currentCountValue = newValue;
      this.trigger('newcountvalue', newValue);
      appEvents.trigger('unreadItemsCount', newValue);

      return newValue;
    },

    _currentCount: function() {
      if(this._currentCountValue) return this._currentCountValue;

      return 0;
    },

    _unreadItemsAdded: function(items) {
      _iteratePreload(items, function(itemType, itemId) {
        this._unreadItemAdded(itemType, itemId);
      }, this);
    },

    _unreadItemsRemoved: function(items) {
      _iteratePreload(items, function(itemType, itemId) {
        this._unreadItemRemoved(itemType, itemId);
      }, this);
    },

    _hasItemBeenMarkedAsRead: function(itemType, itemId) {
      return this._deleteTarpit._contains(itemType, itemId);
    },

    preload: function(items) {
      _iteratePreload(items, function(itemType, itemId) {
        log.info('uic: Preload of ' + itemType + ':' + itemId);

        // Have we already marked this item as read?
        if(this._deleteTarpit._contains(itemType, itemId)) return;

        // Have we already got this item in our store?
        if(this._contains(itemType, itemId)) return;

        // Instantly promote it...
        this._promote(itemType, itemId);
      }, this);
    },

    enableLurkMode: function() {
      this._lurkMode = true;
      // Remove from the add tarpit and the current tarpit
      this._unreadItemsRemoved(this._addTarpit._marshall());
      this._unreadItemsRemoved(this._marshall());
    },

    disableLurkMode: function() {
      this._lurkMode = false;
    },

    markAllReadNotification: function() {
      // Remove from the add tarpit and the current tarpit
      this._unreadItemsRemoved(this._addTarpit._marshall());
      this._unreadItemsRemoved(this._marshall());
    },

    markAllRead: function() {
      var self = this;
      onceUserIdSet(function() {
        apiClient.userRoom.delete("/unreadItems/all")
          .then(function() {
            // Remove from the add tarpit and the current tarpit
            self._unreadItemsRemoved(self._addTarpit._marshall());
            self._unreadItemsRemoved(self._marshall());
          });
      }, self);

    },

    getFirstItemOfType: function(type) {
      var items = this._getItemsOfType(type);
      return items.sort()[0];
    }

  });

  // -----------------------------------------------------
  // This component sends read notifications back to the server
  // -----------------------------------------------------

  var ReadItemSender = function(unreadItemStore) {
    this._buffer = new DoubleHash();
    this._sendLimited = limit(this._send, this, 1000);

    _.bindAll(this,'_onItemMarkedRead', '_onWindowUnload');

    unreadItemStore.on('itemMarkedRead', this._onItemMarkedRead);
    $(window).on('unload', this._onWindowUnload);
    $(window).on('beforeunload', this._onWindowUnload);
  };

  ReadItemSender.prototype = {
    _onItemMarkedRead: function(itemType, itemId, mentioned) {
      this._add(itemType, itemId);
    },

    _onWindowUnload: function() {
      if(this._buffer._count() > 0) {
        // This causes mainthread locks in Safari
        // TODO: send to the parent frame?
        this._send({ sync: true });
      }
    },

    _add: function(itemType, itemId) {
      this._buffer._add(itemType, itemId);
      this._sendLimited();
    },

    _send: function(options) {
      onceUserIdSet(function() {
        var queue = this._buffer._marshall();
        this._buffer = new DoubleHash();

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
              _iteratePreload(queue, function(itemType, itemId) {
                self._buffer._add(itemType, itemId);
              }, self);

              self._sendLimited();
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

          store.preload(snapshot);
        });

      }, this);
    }

  });

  // -----------------------------------------------------
  // Monitors the view port and tells the store when things
  // have been read
  // -----------------------------------------------------

  var TroupeUnreadItemsViewportMonitor = function(scrollElement, unreadItemStore) {
    _.bindAll(this, '_getBounds');

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

      var elementAbove, elementBelow;
      var elementAboveTop, elementBelowTop;
      var unreadItems = this._scrollElement.querySelectorAll('.unread');

      var timeout = 1000;
      var below = 0;
      /* Beware, this is not an array, it's a nodelist. We can't use array methods like forEach  */
      for(var i = 0; i < unreadItems.length; i++) {
        var element = unreadItems[i];

        var itemId = dataset.get(element, 'itemId');
        var mentioned = dataset.get(element, 'mentioned') === 'true';

        if(itemId) {
          var top = element.offsetTop;

          if (top >= topBound && top <= bottomBound) {
            var $e = $(element);

            self._store._markItemRead('chat', itemId, mentioned);

            $e.removeClass('unread').addClass('reading');
            this._addToMarkReadQueue($e);
            timeout = timeout + 100;
          } else if(top > bottomBound) {
            // This item is below the bottom fold
            below++;
            if(elementBelow) {
              if(top < elementBelowTop) {
                elementBelow = element;
                elementBelowTop = top;
              }
            } else {
              elementBelow = element;
              elementBelowTop = top;
            }
          } else if(top < topBound) {
            // This item is above the top fold
            if(elementAbove) {
              if(top > elementAboveTop) {
                elementAbove = element;
                elementAboveTop = top;
              }
            } else {
              elementAbove = element;
              elementAboveTop = top;
            }

          }
        }

      }

      this._foldCount();
    },

    _foldCount: function() {
      var chats = this._store._getItemsOfType('chat');
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

      var allItems = this._scrollElement.querySelectorAll('.chat-item');
      var chatAboveIndex = _.sortedIndex(allItems, topBound - 1, function(item) {
        if(typeof item === 'number') return item;
        return item.offsetTop + item.offsetHeight;
      });

      var chatAboveView = allItems[chatAboveIndex];
      if(chatAboveView) {
        var aboveItemId = dataset.get(chatAboveView, 'itemId');
        if(aboveItemId) {
          chats.forEach(function(chatId) {
            if(chatId <= aboveItemId) above++;
          });
        }
      }

      var chatBelowIndex = _.sortedIndex(allItems, bottomBound + 1, function(item) {
        if(typeof item === 'number') return item;
        return item.offsetTop;
      });

      var chatBelowView = allItems[chatBelowIndex];

      var belowItemId = null;
      var firstUnreadItemBelowId = null;
      if(chatBelowView) {
        belowItemId = dataset.get(chatBelowView, 'itemId');
        if(belowItemId) {
          chats.forEach(function(chatId) {
            if (chatId >= belowItemId) {
              below++;

              if (!firstUnreadItemBelowId) {
                firstUnreadItemBelowId = chatId;
              } else {
                if (firstUnreadItemBelowId > chatId) {
                  firstUnreadItemBelowId = chatId; // Get the lowest number
                }
              }
            }
          });
        }
      }

      acrossTheFoldModel.set({
        unreadAbove: above,
        unreadBelow: below,
        hasUnreadAbove: above > 0,
        hasUnreadBelow: below > 0,
        belowItemId: firstUnreadItemBelowId
      });
    },

    _scheduleMarkRead: function() {
      if(this._markQueue.length !== 0 && !this._timer) {
        var timeout = 300 / this._markQueue.length;
        this._timer = setTimeout(this._markRead.bind(this), timeout);
      }
    },

    _addToMarkReadQueue: function($e) {
      if(!this._markQueue) this._markQueue = [];
      this._markQueue.push($e);
      this._scheduleMarkRead();
    },

    _markRead: function() {
      this._timer = null;
      var $e = this._markQueue.shift();
      if($e) $e.removeClass('reading').addClass('read');
      this._scheduleMarkRead();
    },

    _eyeballStateChange: function(newState) {
      this._inFocus = newState;
      if(newState) {
        this._getBounds();
      }
    }
  };


  // -----------------------------------------------------
  // Monitors the store and removes the css for items that
  // have been read
  // -----------------------------------------------------
  var ReadItemRemover = function(realtimeSync) {
    realtimeSync.on('unreadItemRemoved', this._onUnreadItemRemoved);
  };

  ReadItemRemover.prototype = {
    _onUnreadItemRemoved: function(itemType, itemId) {
      var elements = $('.model-id-' + itemId);
      elements.removeClass('unread').addClass('read');
    }
  };

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
      new ReadItemRemover(realtimeSync);

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

    hasItemBeenMarkedAsRead: function(itemType, itemId) {
      var unreadItemStore = getUnreadItemStoreReq();

      if(!unreadItemStore) {
        return false;
      }

      return unreadItemStore._hasItemBeenMarkedAsRead(itemType, itemId);
    },

    markAllRead: function() {
      var unreadItemStore = getUnreadItemStoreReq();
      unreadItemStore.markAllRead();
    },

    syncCollections: function(collections) {
      var unreadItemStore = getUnreadItemStoreReq();

      unreadItemStore.on('unreadItemRemoved', function(itemType, itemId) {
        var collection = collections[itemType];
        if(!collection) return;


        var v = { unread: false, mentioned: false };
        collection.patch(itemId, v);
      });
    },

    monitorViewForUnreadItems: function($el) {
      var unreadItemStore = getUnreadItemStoreReq();
      return new TroupeUnreadItemsViewportMonitor($el, unreadItemStore);
    },

    getFirstUnreadItem: function() {
      var unreadItemStore = getUnreadItemStoreReq();
      return unreadItemStore.getFirstItemOfType('chat');
    }
  };

  // Mainly useful for testing
  unreadItemsClient.getStore = function() { return _unreadItemStore; };
  unreadItemsClient.DoubleHash = DoubleHash;
  unreadItemsClient.Tarpit = Tarpit;
  unreadItemsClient.UnreadItemStore = UnreadItemStore;


  /* Expose */
  window._unreadItems = unreadItemsClient;

  return unreadItemsClient;

})();
