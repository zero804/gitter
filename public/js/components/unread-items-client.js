/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  './realtime',
  'log!unread-items-client',
  'utils/emitter'
], function($, _, realtime, log, EventEmitter) {
  "use strict";

  function limit(fn, context, timeout) {
    return _.debounce(_.bind(fn, context), timeout || 30);
  }

  function _iteratePreload(items, fn, context) {
    var keys = _.keys(items);
    _.each(keys, function(itemType) {
      _.each(items[itemType], function(itemId) {
        fn.call(context, itemType, itemId);
      });
    });
  }

  var ADD_TIMEOUT = 500;
  var REMOVE_TIMEOUT = 600000;

  // -----------------------------------------------------
  // Stores value pairs
  // -----------------------------------------------------

  var DoubleHash = function() {
    this._data = {};
  };

  DoubleHash.prototype = {
    // Add an item, return true if it did not exist before
    _add: function(itemType, itemId) {
      var substore = this._data[itemType];
      if(!substore) {
        substore = this._data[itemType] = {};
      }

      var exists = substore[itemId];
      if(exists) return false;
      substore[itemId] = true;

      if(this._onItemAdded) this._onItemAdded(itemType, itemId);

      return true;
    },

    // Add an item, return true iff it exists
    _remove: function(itemType, itemId) {
       var substore = this._data[itemType];
      if(!substore) return false;
      var exists = substore[itemId];
      if(!exists) return false;

      delete substore[itemId];

      if(_.keys(substore).length === 0) {
        delete this._data[itemType];
      }

      if(this._onItemRemoved) this._onItemRemoved(itemType, itemId);

      return true;
    },

    _contains: function(itemType, itemId) {
      var substore = this._data[itemType];
      if(!substore) return false;
      return !!substore[itemId];
    },

    _count: function() {
      var types = _.keys(this._data);

      return _.reduce(types, function(memo, itemType) {
        var ids = _.keys(this._data[itemType]);
        return memo + ids.length;
      }, 0, this);
    },

    _marshall: function() {
      var self = this;
      var r = {};
      var types = _.keys(self._data);
      _.each(types, function(itemType) {
        var array = [];

        _.each(_.keys(self._data[itemType]), function(itemId) {
          array.push(itemId);
        });

        r[itemType] = array;
      });

      return r;
    }
  };

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

    this._addTarpit = new Tarpit(ADD_TIMEOUT, _.bind(this._promote, this));
    this._deleteTarpit = new Tarpit(REMOVE_TIMEOUT);
    this._recountLimited = limit(this._recount, this, 30);
    this._currentCountValue = undefined;
  };

  _.extend(UnreadItemStore.prototype, EventEmitter, DoubleHash.prototype, {
    _unreadItemAdded: function(itemType, itemId) {
      if(this._deleteTarpit._contains(itemType, itemId)) return;
      if(this._contains(itemType, itemId)) return;

      this._addTarpit._add(itemType, itemId);
      this._recountLimited();
    },

    _unreadItemRemoved: function(itemType, itemId) {
      if(this._deleteTarpit._contains(itemType, itemId)) return;

      this._deleteTarpit._add(itemType, itemId);
      this._addTarpit._remove(itemType, itemId);
      this._remove(itemType, itemId);

      this.emit('unreadItemRemoved', itemType, itemId);
      this._recountLimited();
    },

    _markItemRead: function(itemType, itemId) {
      this._unreadItemRemoved(itemType, itemId);
      this.emit('itemMarkedRead', itemType, itemId);
    },

    _onItemRemoved: function() {
      // Recount soon
      this._recountLimited();
    },

    _onItemAdded: function() {
      // Recount soon
      this._recountLimited();
    },

    _promote: function(itemType, itemId) {
      this._add(itemType, itemId);
    },

    _recount: function() {
      var newValue = this._count();

      if(this._currentCountValue !== newValue) {
        log('Emitting new count oldValue=', this._currentCountValue, ', newValue=', newValue);

        this._currentCountValue = newValue;
        this.emit('newcountvalue', newValue);
      } else {
        log('Ignoring count update: oldValue=', this._currentCountValue, ', newValue=', newValue);
      }
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
        log('Preload of ' + itemType + ':' + itemId);

        // Have we already marked this item as read?
        if(this._deleteTarpit._contains(itemType, itemId)) return;

        // Have we already got this item in our store?
        if(this._contains(itemType, itemId)) return;

        // Instantly promote it...
        this._promote(itemType, itemId);
      }, this);
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
    _onItemMarkedRead: function(e, itemType, itemId) {
      this._add(itemType, itemId);
    },

    _onWindowUnload: function() {
      if(this._buffer._count() > 0) {
        this._send({ sync: true });
      }
    },

    _add: function(itemType, itemId) {
      this._buffer._add(itemType, itemId);
      this._sendLimited();
    },

    _send: function(options) {
      var queue = this._buffer._marshall();
      this._buffer = new DoubleHash();

      var async = !options || !options.sync;

      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/unreadItems",
        contentType: "application/json",
        data: JSON.stringify(queue),
        async: async,
        type: "POST",
        global: false,
        success: function() {
        },
        error: function() {
        }
      });

    }
  };

  // -----------------------------------------------------
  // Syncs a troupe collection with the unread items client
  // -----------------------------------------------------

  var TroupeCollectionSync = function(troupeCollection, unreadItemStore) {
    this._collection = troupeCollection;
    this._store = unreadItemStore;
    _.bindAll(this, '_onNewCountValue');
    this._store.on('newcountvalue', this._onNewCountValue);

    // Set the initial value
    this._onNewCountValue(null, this._store._currentCount());
  };

  TroupeCollectionSync.prototype = {
    _onNewCountValue: function(event, newValue) {
      log('Syncing store to collection ', newValue);
      if(!window.troupeContext || !window.troupeContext.troupe) return;

      log('TroupeCollectionSync: setting value of ' + window.troupeContext.troupe.id + ' to ' + newValue);

      var troupe = this._collection.get(window.troupeContext.troupe.id);
      if(troupe) {
        troupe.set('unreadItems', newValue);
        log('Completed successfully');
        return;
      }

      if(this._collection.length === 0) {
        this._collection.once('reset sync', function() {

          log('Collection loading, syncing troupe unreadItems');

          var troupe = this._collection.get(window.troupeContext.troupe.id);
          if(troupe) {
            troupe.set('unreadItems', newValue);
          } else {
            log('TroupeCollectionSync: unable to locate locate troupe');
          }
        }, this);
      } else {
        log('TroupeCollectionSync: unable to locate locate troupe');
      }
    }
  };

  // -----------------------------------------------------
  // Sync unread items with realtime notifications coming from the server
  // -----------------------------------------------------

  var TroupeUnreadItemRealtimeSync = function(unreadItemStore) {
    this._store = unreadItemStore;
  };

  _.extend(TroupeUnreadItemRealtimeSync.prototype, EventEmitter, {
    _subscribe: function() {
      var store = this._store;
      var self = this;

      var url = '/user/' + window.troupeContext.user.id + '/troupes/' + window.troupeContext.troupe.id + '/unreadItems';
      var s = realtime.subscribe(url, function(message) {
        if(message.notification === 'unread_items') {
          store._unreadItemsAdded(message.items);
        } else if(message.notification === 'unread_items_removed') {
          var items = message.items;
          store._unreadItemsRemoved(items);

          _iteratePreload(items, function(itemType, itemId) {
            this.emit('unreadItemRemoved', itemType, itemId);
          }, self);
        }
      });

      s.callback(function() {
        var snapshot = realtime.getSnapshotFor(url);
        if(snapshot) {
          store.preload(snapshot);
        }
      });
    }
  });

  // -----------------------------------------------------
  // Sync a troupe collection with unread counts (for other troupes)
  // from the server
  // -----------------------------------------------------

  var TroupeCollectionRealtimeSync = function(troupeCollection) {
    this._collection = troupeCollection;
  };

  TroupeCollectionRealtimeSync.prototype = {
    _subscribe: function() {
       var self = this;
       realtime.subscribe('/user/' + window.troupeContext.user.id, function(message) {
        if(message.notification !== 'troupe_unread') return;
        self._handleIncomingMessage(message);
      });
    },

    _handleIncomingMessage: function(message) {
      var troupeId = message.troupeId;
      var totalUnreadItems = message.totalUnreadItems;

      if(troupeId === window.troupeContext.troupe.id) return;

      log('Updating troupeId' + troupeId + ' to ' + totalUnreadItems);

      var model = this._collection.get(troupeId);
      if(!model) {
        log("Cannot find model. Refresh might be required....");
        return;
      }

      // TroupeCollectionSync keeps track of the values
      // for this troupe, so ignore those values
      model.set('unreadItems', totalUnreadItems);
    }
  };


  // -----------------------------------------------------
  // Counts all the unread items in a troupe collection and
  // publishes notifications on changes
  // -----------------------------------------------------

  var TroupeUnreadNotifier = function(troupeCollection, store) {
    this._collection = troupeCollection;
    this._store = store;

    this._currentStoreValueChanged = _.bind(this._currentStoreValueChanged, this);

    this._recountLimited = limit(this._recount, this, 50);
    this._collection.on('change:unreadItems', this._recountLimited);
    this._collection.on('reset', this._recountLimited);
    this._collection.on('sync', this._recountLimited);
    this._collection.on('add', this._recountLimited);
    this._collection.on('remove', this._recountLimited);
    this._collection.on('destroy', this._recountLimited);

    if(store) {
      this._store.on('newcountvalue', this._currentStoreValueChanged);
    }

    this._recountLimited();
  };

  // storing the previous counts here so we can return it to outside callers,
  // even though we don't always have a reference to TroupeNotifier internally.
  // TODO: fix this enormous hack!
  var counts = {
    other: 0,
    overall: null,
    normal: null,
    oneToOne: null,
    current: null
  };

  TroupeUnreadNotifier.prototype = {
    _currentStoreValueChanged: function() {
      this._recountLimited();
    },


    _recount: function() {
      var self = this;
      function count(memo, troupe) {
        if(window.troupeContext && window.troupeContext.troupe) {
          if(troupe.get('id') === window.troupeContext.troupe.id) {
            return memo + (self._store._currentCount() > 0 ? 1 : 0);
          }
        }

        var c = troupe.get('unreadItems');
        return memo + (c > 0 ? 1 : 0);
      }

      var c = this._collection;

      var newTroupeUnreadTotal = c.reduce(count, counts.other);
      var newPplTroupeUnreadTotal = c.filter(function(trp) { return trp.get('oneToOne'); }).reduce(count, 0);
      var newNormalTroupeUnreadTotal = c.filter(function(trp) { return !trp.get('oneToOne'); }).reduce(count, 0);

      //if(newTroupeUnreadTotal !== counts.overall ||
      //   newPplTroupeUnreadTotal !== counts.oneToOne ||
      //   newNormalTroupeUnreadTotal !== counts.normal) {

        // TODO: fix this enormous hack!
        counts.overall = newTroupeUnreadTotal;
        counts.oneToOne = newPplTroupeUnreadTotal;
        counts.normal = newNormalTroupeUnreadTotal;
        counts.current = this._store && this._store._currentCount();

        $(document).trigger('troupeUnreadTotalChange', counts);
      //}
    }

  };


  // -----------------------------------------------------
  // Monitors the view port and tells the store when things
  // have been read
  // -----------------------------------------------------

  var TroupeUnreadItemsViewportMonitor = function(unreadItemStore) {
    _.bindAll(this, '_eyeballStateChange', '_getBounds');

    this._store = unreadItemStore;
    this._windowScrollLimited = limit(this._windowScroll, this, 150);
    this._inFocus = true;

    this._scrollTop = 1000000000;
    this._scrollBottom = 0;

    this._$window = $(window);

    $(document).on('eyeballStateChange', this._eyeballStateChange);

    this._$window.on('scroll', this._getBounds);

    // this is not a live collection so this will not work inside an SPA
    $('.mobile-scroll-class').on('scroll', this._getBounds);

    // TODO: don't reference this frame directly!
    $('#toolbar-frame').on('scroll', this._getBounds);

    $(document).on('unreadItemDisplayed', this._getBounds);

    // When the UI changes, rescan
    $(document).on('appNavigation', this._getBounds);
  };

  TroupeUnreadItemsViewportMonitor.prototype = {
    _getBounds: function() {
      if(!this._inFocus) {
        return;
      }

      var scrollTop = this._$window.scrollTop();
      var scrollBottom = scrollTop + this._$window.height();

      if(scrollTop < this._scrollTop) {
        this._scrollTop = scrollTop;
      }

      if(scrollBottom > this._scrollBottom) {
        this._scrollBottom = scrollBottom;
      }

      this._windowScrollLimited();
    },

    _windowScroll: function() {
      if(!this._inFocus) {
        return;
      }

      var self = this;

      var topBound = this._scrollTop;
      var bottomBound = this._scrollBottom;

      this._scrollTop = 1000000000;
      this._scrollBottom = 0;

      $('.unread').each(function (index, element) {
        var $e = $(element);
        var itemType = $e.data('itemType');
        var itemId = $e.data('itemId');

        if(itemType && itemId) {
          // offset() is relative to window, which is used to determine visibility
          var top = $e.offset().top;

          if (top >= topBound && top <= bottomBound) {
            self._store._markItemRead(itemType, itemId);

            $e.removeClass('unread').addClass('reading');
            setTimeout(function() {
              $e.removeClass('reading').addClass('read');
            }, 2000);
          }
        }

      });
    },

    _eyeballStateChange: function(e, newState) {
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
    _onUnreadItemRemoved: function(e, itemType, itemId) {
      var elements = $('.model-id-' + itemId);
      elements.removeClass('unread').addClass('read');
    }
  };

  var c = window.troupeContext;

  var unreadItemStore;
  var realtimeSync;

  if(c) {
    if(c.troupe) {
      unreadItemStore = new UnreadItemStore();
      new ReadItemSender(unreadItemStore);
      new TroupeUnreadItemsViewportMonitor(unreadItemStore);

      realtimeSync = new TroupeUnreadItemRealtimeSync(unreadItemStore);

      if(c.user) {
        realtimeSync._subscribe();
        new ReadItemRemover(realtimeSync);
      }

    }

  }

  var unreadItemsClient = {
    preload: function(items) {
      unreadItemStore.preload(items);
    },

    // This method sucks. TODO: make it not suck
    getCounts: function() {
      return {
        others: counts.other,
        overall: counts.overall,
        normal: counts.normal,
        oneToOne: counts.oneToOne,
        current: unreadItemStore ? unreadItemStore._currentCount() : undefined
      };
    },

    setOtherCount: function(count) {
      counts.other = count;
      // Note: this should trigger a recount but that is done from the caller because we don't have a reference to the TroupeNotifier instance.
    },

    hasItemBeenMarkedAsRead: function(itemType, itemId) {
      if(!unreadItemStore) {
        return false;
      }

      return unreadItemStore._hasItemBeenMarkedAsRead(itemType, itemId);
    },

    findTopMostUnreadItemPosition: function(itemType, $container/*, $scrollOf*/) {
      var topItem = null;
      var topItemOffset = 1000000000;

      var unreadElements = $container.find('.unread');

      unreadElements.each(function (index, element) {

        var $e = $(element);
        var elementItemType = $e.data('itemType');
        if(elementItemType != itemType) return;
        var itemId = $e.data('itemId');

        // nb: use the offset of the top item relative to it's parent (which must have position: relative)
        if(itemId) {
          var top = $e.position().top;
          if(top < topItemOffset)  {
            topItem = $e;
            topItemOffset = top;
          }
        }
      });

      if(!topItem) return null;
      // note: mobile will never have a scroll limit because eyaballs are never off, so items are marked as read immediately,
      // but it does still find an unread item when new messages come in, but it will always be the new item because the rest are marked read immediately.

      return topItemOffset;
    },

    installTroupeListener: function(troupeCollection) {
      if(unreadItemStore) {
        new TroupeCollectionSync(troupeCollection, unreadItemStore);
      }

      new TroupeCollectionRealtimeSync(troupeCollection)._subscribe();
      new TroupeUnreadNotifier(troupeCollection, unreadItemStore);
    },

    syncCollections: function(collections) {
      unreadItemStore.on('itemMarkedRead', function(e, itemType, itemId) {
        var collection = collections[itemType];
        if(!collection) return;

        var item = collection.get(itemId);
        if(item) item.set('unread', false, { silent: true });
      });
    }
  };

  // Mainly useful for testing
  unreadItemsClient._store = unreadItemStore;
  unreadItemsClient.DoubleHash = DoubleHash;
  unreadItemsClient.Tarpit = Tarpit;
  unreadItemsClient.UnreadItemStore = UnreadItemStore;
  unreadItemsClient.TroupeCollectionSync = TroupeCollectionSync;
  unreadItemsClient.TroupeCollectionRealtimeSync = TroupeCollectionRealtimeSync;
  unreadItemsClient.TroupeUnreadNotifier = TroupeUnreadNotifier;

  return unreadItemsClient;
});
