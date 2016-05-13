"use strict";
var _               = require('underscore');
var context         = require('utils/context');
var realtime        = require('./realtime');
var apiClient       = require('./apiClient');
var debug           = require('debug-proxy')('app:unread-items-client');
var Backbone        = require('backbone');
var appEvents       = require('utils/appevents');
var UnreadItemStore = require('./unread-items-client-store');
var log             = require('utils/log');
var raf             = require('utils/raf')
var addPassiveScrollListener = require('utils/passive-scroll-listener');

module.exports = (function() {


  function limit(fn, context, timeout) {
    return _.throttle(fn.bind(context), timeout || 30, { leading: false });
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

  var DeletePit = function() {
    this._items = {};
    this._timer = setInterval(this._gc.bind(this), 60000);
  };

  DeletePit.prototype = {
    add: function(itemId) {
      this._items[itemId] = Date.now();
    },

    remove: function(itemId) {
      delete this._items[itemId];
    },

    contains: function(itemId) {
      return !!this._items[itemId];
    },

    _gc: function() {
      var horizon = Date.now() - 5 * 60 * 1000; // 5 minutes
      var items = this._items;

      Object.keys(items).forEach(function(itemId) {
        if (items[itemId] < horizon) {
          delete items[itemId];
        }
      });
    }
  };

  // -----------------------------------------------------
  // This component sends read notifications back to the server
  // -----------------------------------------------------

  var ReadItemSender = function(unreadItemStore) {
    this._buffer = {};
    this._sendLimited = limit(this._send, this, 1000);
    this._updateLastAccessLimited = limit(this._updateLastAccess, this, 1000);
    this._clearActivityBadgeLimited = limit(this._clearActivityBadge, this, 100);

    unreadItemStore.on('itemMarkedRead', this._onItemMarkedRead.bind(this));

    var bound = this._onWindowUnload.bind(this);
    ['unload', 'beforeunload'].forEach(function(e) {
      window.addEventListener(e, bound, false);
    });
  };

  ReadItemSender.prototype = {
    _onItemMarkedRead: function(itemId, mention, lurkMode) {

      // Update last access time to keep track of last viewed items
      if (lurkMode) {
        this._updateLastAccessLimited();
        this._clearActivityBadgeLimited();
      }

      // Don't sent unread items back to the server in lurk mode unless its a mention
      if (lurkMode && !mention) return;

      var troupeId = context.getTroupeId();
      var buffer = this._buffer[troupeId];
      if (!buffer) {
        buffer = this._buffer[troupeId] = {};
      }

      // All items marked as read are send back to the server
      // as chats
      buffer[itemId] = true;
      this._sendLimited();
    },

    _onWindowUnload: function() {
      if(Object.keys(this._buffer) > 0) {
        // Beware: This causes mainthread locks in Safari
        this._send({ sync: true });
      }
    },

    _updateLastAccess: function() {
      debug('_updateLastAccess');

      // TODO: fix this date. It is too far into the future
      // wrong in so many ways
      apiClient.userRoom.put('', { updateLastAccess: new Date() })
      .then(function() {
        debug('_updateLastAccess done');
      });
    },

    _clearActivityBadge: function() {
      appEvents.trigger('clearActivityBadge');
    },

    _send: function(options) {
      debug('_send');

      Object.keys(this._buffer).forEach(function(troupeId) {
        this._sendForRoom(troupeId, options);
      }, this);
    },

    _sendForRoom: function(troupeId, options) {
      debug('_sendForRoom: %s', troupeId);

      var items = Object.keys(this._buffer[troupeId]);
      delete this._buffer[troupeId];
      if (!items.length) return;

      var queue = { chat: items };

      var async = !options || !options.sync;

      var attempts = 0;
      function attemptPost() {
        // Note, we can't use the apiClient.userRoom endpoint
        // as the room may have changed since the item was read.
        // For example, after a room switch we don't want to
        // be marking items as read in another room
        apiClient.user.post('/rooms/' + troupeId + '/unreadItems', queue, {
            async: async,
            global: false
          })
          .catch(function() {
            debug('Error posting unread items to server. Will attempt again in 5s');

            if (++attempts < 10) {
              // Unable to send messages, requeue them and try again in 5s
              setTimeout(attemptPost, 5000);
            }

          });

      }

      onceUserIdSet(attemptPost);
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
      var store = this._store;
      var templateSubscription = realtime.getClient().subscribeTemplate({
        urlTemplate: '/v1/user/:userId/rooms/:troupeId/unreadItems',
        contextModel: context.contextModel(),
        onMessage: function(message) {
          debug('Realtime: Channel message: %j', message);

          switch(message.notification) {
            // New unread items
            case 'unread_items':
              store.add(message.items);
              break;

            // Unread items removed
            case 'unread_items_removed':
              store.remove(message.items);
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
        },

        handleSnapshot: function(snapshot) {
          debug('Realtime: Channel snapshot: %j', snapshot);

          var roomMember = context.troupe().get('roomMember');
          var lurk = snapshot._meta && snapshot._meta.lurk;
          var isLurking = lurk || !roomMember;

          // TODO: send the recently marked items back to the server
          store.reset(snapshot, isLurking);
        }
      });

      templateSubscription.on('resubscribe', function() {
        debug('Realtime: resubscribe');

        store.state = 'LOADING';
        store.reset();
      });

    }

  });

  // -----------------------------------------------------
  // Monitors the view port and tells the store when things
  // have been read
  // -----------------------------------------------------

  var TroupeUnreadItemsViewportMonitor = function(scrollElement, unreadItemStore, collectionView) {
    var boundGetBounds = this._getBounds.bind(this);
    var limitedGetBounds = limit(this._getBounds, this, 100);
    var debouncedGetBounds = _.debounce(this._getBounds.bind(this), 100);
    this._collectionView = collectionView;
    this._scrollElement = scrollElement[0] || scrollElement;

    this._store = unreadItemStore;
    this._windowScrollLimited = limit(this._windowScroll, this, 50);

    var foldCountLimited = this._foldCountLimited = limit(this._foldCount, this, 50);
    this._inFocus = true;

    appEvents.on('eyeballStateChange', this._eyeballStateChange, this);

    function rafGetBounds() {
      raf(boundGetBounds);
    }
    addPassiveScrollListener(this._scrollElement, rafGetBounds);

    // this is not a live collection so this will not work inside an SPA
    //$('.mobile-scroll-class').on('scroll', boundGetBounds);

    unreadItemStore.on('newcountvalue', foldCountLimited);
    ['unreadItemRemoved', 'change:status', 'itemMarkedRead', 'add'].forEach(function(evt) {
      unreadItemStore.on(evt, limitedGetBounds);
    });

    // Check for unread items when things are added to the collection
    // Only do it every 100ms or so
    collectionView.collection.on('add', debouncedGetBounds);

    // This is a catch all for for unread items that are
    // not marked as read
    setInterval(limitedGetBounds, 2000);

    // If the user seen this messages and updated the last access time in
    // a different window, mark the messages in this window as read.
    var self = this;
    collectionView.listenTo(context.troupe(), 'change:lastAccessTime', function(room) {
      if (!context.troupe().get('lurk')) return;

      var lastAccess = room.get('lastAccessTime');
      this.collection.forEach(function(chat) {
        if (chat.get('sent').isBefore(lastAccess) && chat.get('unread')) {
          self._store.markItemRead(chat.id);
        }
      });

    });
  };

  TroupeUnreadItemsViewportMonitor.prototype = {
    _viewReady: function() {
      var cv = this._collectionView;
      var childCollection = cv.collection;
      var ready = childCollection.models.length === cv.children.length;

      if (!ready) {
        debug("Mismatch: collection.length=%s, collectionView.length=%s", childCollection.models.length, cv.children.length);
      }

      return ready;
    },

    _getBounds: function() {
      if (!this._inFocus) {
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

      if (!this._viewReady()) {
        debug('Skipping windowScroll until view is ready....');
        // Not ready, try again later
        this._windowScrollLimited();
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

        self._store.markItemRead(model.id);
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
        debug("Mismatch between childCollection.models.length (%s) and cv.children.length (%s) resorting to oddness", childCollection.models.length, cv.children.length);

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

    _resetFoldModel: function() {
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
    },

    _foldCount: function() {
      if (!this._viewReady()) {
        debug('Skipping fold count until view is ready');
        // Not ready, try again later
        this._foldCountLimited();
        return;
      }

      var store = this._store;
      var chats = store.getItems();
      if(!chats.length) {
        this._resetFoldModel();
        return;
      }

      var above = 0;
      var below = 0;

      var mentionsAbove = 0;
      var mentionsBelow = 0;

      var scrollElement = this._scrollElement;

      var topBound = scrollElement.scrollTop;
      var bottomBound = topBound + scrollElement.clientHeight;
      if (bottomBound >= scrollElement.scrollHeight - 10) {
        /* At the bottom? */
        bottomBound =  Number.POSITIVE_INFINITY;
      }

      var modelsInRange = this.findModelsInViewport(topBound, bottomBound);
      if (!modelsInRange.length) {
        this._resetFoldModel();
        return;
      }

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
          if (store._items[itemId])  {
            mentionsAbove++;
            oldestMentionId = itemId;
          }
        }
        if (itemId > lastItemId) {
          below++;
          if (!mostRecentUnreadItemId) mostRecentUnreadItemId = itemId;
          if (store._items[itemId]) {
            mentionsBelow++;
            if (!mostRecentMentionId) mostRecentMentionId = itemId;
          }
        }
      });

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
    collection.on('add', function(model) {
      /* Prevents a race-condition when something has already been marked as deleted */
      if (!model.id || !model.get('unread')) return;
      if (store.isMarkedAsRead(model.id)) {
        debug('item already marked as read');
        model.set('unread', false);
      }
    });

    store.on('unreadItemRemoved', function(itemId) {
      debug('CollectionSync: unreadItemRemoved: %s mention=%s', itemId);
      collection.patch(itemId, { unread: false, mentioned: false }, { fast: true });
    });

    store.on('itemMarkedRead', function(itemId, mention) {
      debug('CollectionSync: itemMarkedRead: %s mention=%s', itemId, mention);

      collection.patch(itemId, { unread: false, mentioned: mention });
    });

    store.on('change:status', function(itemId, mention) {
      debug('CollectionSync: change:status: %s mention=%s', itemId);

      collection.patch(itemId, { unread: true,  mentioned: mention });
    });

    store.on('add', function(itemId, mention) {
      debug('CollectionSync: add: %s mention=%s', itemId, mention);

      // See https://github.com/troupe/gitter-webapp/issues/1055
      function patchComplete(id, found) {
        if (found) return;
        // Only perform this sanity check if we're at the bottom
        // of the collection
        if (!collection.atBottom) return;
        if (!collection.length) return;
        var firstItem = collection.at(0);
        if (id < firstItem.id) return;

        // At this point, we know that the patch was for an item which
        // should be in the collection, but was not found.
        // This is a problem
        log.warn('An unread item does not exist in the chat collection: id=' + id);
        appEvents.trigger('stats.event', 'missing.chat.item');
      }

      collection.patch(itemId, { unread: true, mentioned: mention }, null, patchComplete);
    });

    store.on('reset', function() {
      debug('CollectionSync: reset');
      var items = store.getItemHash();

      collection.each(function(model) {
        var id = model.id;
        var unreadState = items[id];
        var setOptions = { fast: true };

        if (unreadState === false) {
          model.set({ unread: true, mentioned: false }, setOptions);
        } else if (unreadState === true) {
          model.set({ unread: true, mentioned: true }, setOptions);
        } else {
          model.set({ unread: false, mentioned: false }, setOptions);
        }
      });

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

      // Bridge events to appEvents
      _unreadItemStore.on('newcountvalue', function(count) {
        appEvents.trigger('unreadItemsCount', count);
      });

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

      onceUserIdSet(function() {
        apiClient.userRoom.delete("/unreadItems/all")
          .then(function() {
            unreadItemStore.markAllRead();
          });
      });
    },

    syncCollections: function(collections) {
      var unreadItemStore = getUnreadItemStoreReq();
      new CollectionSync(unreadItemStore, collections.chat);

    },

    monitorViewForUnreadItems: function($el, collectionView) {
      var unreadItemStore = getUnreadItemStoreReq();
      return new TroupeUnreadItemsViewportMonitor($el, unreadItemStore, collectionView);
    }
  };

  // Mainly useful for testing
  unreadItemsClient.getStore = function() { return _unreadItemStore; };
  unreadItemsClient.UnreadItemStore = UnreadItemStore;


  /* Expose */
  window._unreadItems = unreadItemsClient;

  return unreadItemsClient;

})();
