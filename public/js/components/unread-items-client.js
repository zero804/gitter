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
    this._currentCountValue = -1;
  };

  _.extend(UnreadItemStore.prototype, EventEmitter, DoubleHash.prototype, {
    _unreadItemAdded: function(itemType, itemId) {
      if(this._deleteTarpit._contains(itemType, itemId)) return;
      if(this._contains(itemType, itemId)) return;

      this._addTarpit._add(itemType, itemId);
    },

    _unreadItemRemoved: function(itemType, itemId) {
      if(this._deleteTarpit._contains(itemType, itemId)) return;

      this._deleteTarpit._add(itemType, itemId);
      this._addTarpit._remove(itemType, itemId);
      this._remove(itemType, itemId);

      this.emit('unreadItemRemoved', itemType, itemId);
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
      if(newValue !== this._currentCountValue) {
        this._currentCountValue = newValue;
        this.emit('newcountvalue', newValue);
      }
    },

    _currentCount: function() {
      if(this._currentCountValue < 0) return 0;

      return this._currentCountValue;
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

    preload: function(items) {
      _iteratePreload(items, function(itemType, itemId) {
        if(this._deleteTarpit._contains(itemType, itemId)) return;
        if(this._contains(itemType, itemId)) return;

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
  };

  TroupeCollectionSync.prototype = {
    _onNewCountValue: function(event, newValue) {
      if(!window.troupeContext || !window.troupeContext.troupe) return;

      var troupe = this._collection.get(window.troupeContext.troupe.id);
      if(troupe) {
        troupe.set('unreadItems', newValue);
      }
    }
  };

  // -----------------------------------------------------
  // Sync unread items with realtime notifications coming from the server
  // -----------------------------------------------------

  var TroupeUnreadItemRealtimeSync = function(unreadItemStore) {
    this._store = unreadItemStore;
    this._subscribe();
  };

  _.extend(TroupeUnreadItemRealtimeSync.prototype, EventEmitter, {
    _subscribe: function() {
      var store = this._store;
      var self = this;

      realtime.subscribe('/user/' + window.troupeContext.user.id + '/troupes/' + window.troupeContext.troupe.id, function(message) {
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
      log("troupe_unread change", message);

      var troupeId = message.troupeId;
      var totalUnreadItems = message.totalUnreadItems;

      if(troupeId === window.troupeContext.troupe.id) return;

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

  var TroupeUnreadNotifier = function(troupeCollection) {
    this._collection = troupeCollection;

    this._recountLimited = limit(this._recount, this, 30);
    this._collection.on('change:unreadItems', this._recountLimited);
    this._collection.on('reset', this._recountLimited);
    this._collection.on('add', this._recountLimited);
    this._collection.on('remove', this._recountLimited);
    this._collection.on('destroy', this._recountLimited);

    this._recountLimited();
  };

  // storing the previous counts here so we can return it to outside callers,
  // even though we don't always have a reference to TroupeNotifier internally.
  // TODO: fix this enormous hack!
  var counts = {
    overall: null,
    normal: null,
    oneToOne: null,
    current: null
  };

  TroupeUnreadNotifier.prototype = {

    _recount: function() {

      function count(memo, troupe) {
        var c = troupe.get('unreadItems');
        return memo + (c > 0 ? 1 : 0);
      }

      var c = this._collection;

      var newTroupeUnreadTotal = c.reduce(count, 0);
      var newPplTroupeUnreadTotal = c.filter(function(trp) { return trp.get('oneToOne'); }).reduce(count, 0);
      var newNormalTroupeUnreadTotal = c.filter(function(trp) { return !trp.get('oneToOne'); }).reduce(count, 0);

      if(newTroupeUnreadTotal !== counts.overall ||
         newPplTroupeUnreadTotal !== counts.oneToOne ||
         newNormalTroupeUnreadTotal !== counts.normal) {

        // TODO: fix this enormous hack!
        counts.overall = newTroupeUnreadTotal;
        counts.oneToOne = newPplTroupeUnreadTotal;
        counts.normal = newNormalTroupeUnreadTotal;
        counts.current = unreadItemStore._currentCount();

        $(document).trigger('troupeUnreadTotalChange', counts);
      }
    }

  };


  // -----------------------------------------------------
  // Monitors the view port and tells the store when things
  // have been read
  // -----------------------------------------------------

  var TroupeUnreadItemsViewportMonitor = function(unreadItemStore) {
    _.bindAll(this, '_eyeballStateChange');

    this._store = unreadItemStore;
    this._windowScrollLimited = limit(this._windowScroll, this, 50);
    this._inFocus = true;

    $(document).on('eyeballStateChange', this._eyeballStateChange);

    $(window).on('scroll', this._windowScrollLimited);

    // this is not a live collection so this will not work inside an SPA
    $('.mobile-scroll-class').on('scroll', this._windowScrollLimited);

    // TODO: don't reference this frame directly!
    $('#toolbar-frame').on('scroll', this._windowScrollLimited);

    $(document).on('unreadItemDisplayed', this._windowScrollLimited);

    // When the UI changes, rescan
    $(document).on('appNavigation', this._windowScrollLimited);
  };

  TroupeUnreadItemsViewportMonitor.prototype = {
    _windowScroll: function() {
      if(!this._inFocus) {
        return;
      }

      var $window = $(window);
      var scrollTop = $window.scrollTop();
      var scrollBottom = scrollTop + $window.height();
      var self = this;

      $('.unread').each(function (index, element) {
        var $e = $(element);
        var itemType = $e.data('itemType');
        var itemId = $e.data('itemId');

        if(itemType && itemId) {
          var top = $e.offset().top;

          if (top >= scrollTop && top <= scrollBottom) {
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
        this._windowScrollLimited();
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
      log('incomng unread item: ', itemType, itemId);
      $('.unread.model-id-' + itemId).removeClass('unread').addClass('read');
    }
  };

  var unreadItemStore = new UnreadItemStore();
  new ReadItemSender(unreadItemStore);
  new TroupeUnreadItemsViewportMonitor(unreadItemStore);

  var realtimeSync = new TroupeUnreadItemRealtimeSync(unreadItemStore);
  new ReadItemRemover(realtimeSync);

  var unreadItemsClient = {

    getCounts: function() {
      return {
        overall: counts.overall,
        normal: counts.normal,
        oneToOne: counts.oneToOne,
        current: unreadItemStore._currentCount()
      };
    },

    findTopMostVisibleUnreadItemPosition: function(itemType) {
      var topItem = null;
      var topItemOffset = 1000000000;

      var $window = $(window);
      var scrollTop = $window.scrollTop();
      var scrollBottom = scrollTop + $window.height();


      $('.unread').each(function (index, element) {
        var $e = $(element);
        var elementItemType = $e.data('itemType');
        if(elementItemType != itemType) return;
        var itemId = $e.data('itemId');

        if(itemId) {
          var top = $e.offset().top;
          if (top >= scrollTop && top <= scrollBottom) {
            if(top < topItemOffset)  {
              topItem = $e;
              topItemOffset = top;
            }
          }
        }
      });

      if(!topItem) return null;
      return topItem.offset();
    },

    installTroupeListener: function(troupeCollection) {
      new TroupeCollectionSync(troupeCollection, unreadItemStore);
      new TroupeCollectionRealtimeSync(troupeCollection)._subscribe();
      new TroupeUnreadNotifier(troupeCollection);
    }
  };

  // Mainly useful for testing
  unreadItemsClient.DoubleHash = DoubleHash;
  unreadItemsClient.Tarpit = Tarpit;
  unreadItemsClient.UnreadItemStore = UnreadItemStore;
  unreadItemsClient.TroupeCollectionSync = TroupeCollectionSync;
  unreadItemsClient.TroupeCollectionRealtimeSync = TroupeCollectionRealtimeSync;
  unreadItemsClient.TroupeUnreadNotifier = TroupeUnreadNotifier;


  return unreadItemsClient;
});
