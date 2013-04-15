/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  './realtime',
  'log!unread-items-client'
], function($, _, realtime, log) {
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
  var REMOVE_TIMEOUT = 15000;

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
      return substore[itemId];
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

  var UnreadItemStore = function() {
    DoubleHash.call(this);

    this._addTarpit = new Tarpit(ADD_TIMEOUT, _.bind(this._promote, this));
    this._deleteTarpit = new Tarpit(REMOVE_TIMEOUT);
    this._recountLimited = limit(this._recount, this, 30);
    this._currentCountValue = -1;
  };

  _.extend(UnreadItemStore.prototype, DoubleHash.prototype, {
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
    },

    _markItemRead: function(itemType, itemId) {
      this._unreadItemRemoved(itemType, itemId);
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
        if(this.onNewCountValue) {
          this.onNewCountValue(newValue);
        }
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

  var ReadItemSender = function() {
    this._buffer = new DoubleHash();
    this._sendLimited = limit(this._send, this, 5000);
  };

  ReadItemSender.prototype = {
    _add: function(itemType, itemId) {
      this._buffer._add(itemType, itemId);
      this._sendLimited();
    },

    _send: function() {
      var queue = this._buffer._marshall();
      this._buffer = new DoubleHash();

      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/unreadItems",
        contentType: "application/json",
        data: JSON.stringify(queue),
        type: "POST",
        global: false,
        success: function() {
        },
        error: function() {
        }
      });

    }
  };

  var sender = new ReadItemSender();
  var unreadItemStore = new UnreadItemStore();

  function markItemRead(itemType, itemId) {
    unreadItemStore._markItemRead(itemType, itemId);
    sender._add(itemType, itemId);
  }

  var inFocus = true;

  $(document).on('eyeballStateChange', function(e, newState) {
    inFocus = newState;
    if(newState) {
      windowScroll();
    }
  });


  var windowTimeout = null;
  var windowScrollOnTimeout = function windowScrollOnTimeout() {
    windowTimeout = null;
    if(!inFocus) {
      return;
    }

    var $window = $(window);
    var scrollTop = $window.scrollTop();
    var scrollBottom = scrollTop + $window.height();

    $('.unread').each(function (index, element) {
      var $e = $(element);
      var itemType = $e.data('itemType');
      var itemId = $e.data('itemId');

      // log("found an unread item: itemType ", itemType, "itemId", itemId);

      if(itemType && itemId) {
        var top = $e.offset().top;

        if (top >= scrollTop && top <= scrollBottom) {

          setTimeout(function () {
            $e.removeClass('unread');
            $e.addClass('read');
            markItemRead(itemType, itemId);
          }, 2000);
        }
      }

    });
  };

  function windowScroll() {
    if(!windowTimeout) {
      windowTimeout = window.setTimeout(windowScrollOnTimeout, 90);
    }
  }

  $(window).on('scroll', windowScroll);

  // this is not a live collection so this will not work inside an SPA
  $('.mobile-scroll-class').on('scroll', windowScroll);

  // TODO: don't reference this frame directly!
  $('#toolbar-frame').on('scroll', windowScroll);

  $(document).on('unreadItemDisplayed', function() {
    windowScroll();
  });

  // When the UI changes, rescan
  $(document).on('appNavigation', function() {
    windowScroll();
  });


  function newUnreadItems(items) {
    unreadItemStore._unreadItemsAdded(items);
  }

  function unreadItemsRemoved(items) {
    unreadItemStore._unreadItemsRemoved(items);

    // remove the unread item css
    _.each(items, function(ids) {
      _.each(ids, function(id) {
        $('.unread.model-id-'+id).removeClass('unread').addClass('read');
      });
    });
  }

  var unreadItemsClient = {

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

    getTotalUnreadCountForCurrentTroupe: function() {
      return unreadItemStore._currentCount();
    },

    installTroupeListener: function(troupeCollection) {
      var troupeUnreadTotal = -1, pplTroupeUnreadTotal = -1, normalTroupeUnreadTotal = -1;

      function recount() {
        function count(memo, troupe) {
          var c;
          if(troupe.id == window.troupeContext.troupe.id) {
            c = unreadItemsClient.getTotalUnreadCountForCurrentTroupe();
          } else {
            c = troupe.get('unreadItems');
          }

          return memo + (c > 0 ? 1 : 0);
        }

        var newTroupeUnreadTotal = troupeCollection.reduce(count, 0);
        var newPplTroupeUnreadTotal = troupeCollection.filter(function(trp) { return trp.get('oneToOne'); }).reduce(count, 0);
        var newNormalTroupeUnreadTotal = troupeCollection.filter(function(trp) { return !trp.get('oneToOne'); }).reduce(count, 0);

        if(newTroupeUnreadTotal !== troupeUnreadTotal || newPplTroupeUnreadTotal !== pplTroupeUnreadTotal || newNormalTroupeUnreadTotal !== normalTroupeUnreadTotal) {
          troupeUnreadTotal = newTroupeUnreadTotal;
          pplTroupeUnreadTotal = newPplTroupeUnreadTotal;
          normalTroupeUnreadTotal = newNormalTroupeUnreadTotal;
          $(document).trigger('troupeUnreadTotalChange', { overall: newTroupeUnreadTotal, normal: normalTroupeUnreadTotal, oneToOne: pplTroupeUnreadTotal } );
        }
      }

      if (troupeCollection) {
        troupeCollection.on('reset', function() {
          recount();
        });
      }

      $(document).on('itemUnreadCountChanged', function() {
        if(troupeCollection) {
          var model = troupeCollection.get(window.troupeContext.troupe.id);
          if(model) {
            model.set('unreadItems', unreadItemsClient.getTotalUnreadCountForCurrentTroupe());
          }
        }
        recount();
      });

      realtime.subscribe('/user/' + window.troupeContext.user.id, function(message) {
        log('User message', message);
        if(message.notification === 'troupe_unread') {
          log("troupe_unread change", message);

          var troupeId = message.troupeId;
          var totalUnreadItems = message.totalUnreadItems;

          var model = (troupeCollection) ? troupeCollection.get(troupeId) : null;
          if(model) {
            if(troupeId == window.troupeContext.troupe.id) {
              var actualValue = unreadItemsClient.getTotalUnreadCountForCurrentTroupe();
              model.set('unreadItems', actualValue);
            } else {
              model.set('unreadItems', totalUnreadItems);
            }

          } else {
            // TODO: sort this out
            log("Cannot find model. Refresh might be required....");
          }

          recount();
        }
      });

      realtime.subscribe('/user/' + window.troupeContext.user.id + '/troupes/' + window.troupeContext.troupe.id, function(message) {
        if(message.notification === 'unread_items') {
          newUnreadItems(message.items);
        } else if(message.notification === 'unread_items_removed') {
          unreadItemsRemoved(message.items);
        }
      });


      if(troupeCollection) {
        recount();
      }
    }
  };

  // Mainly useful for testing
  unreadItemsClient.Tarpit = Tarpit;
  unreadItemsClient.UnreadItemStore = UnreadItemStore;

  return unreadItemsClient;
});
