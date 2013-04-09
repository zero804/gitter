/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  './realtime',
  'utils/log'
], function($, _, realtime, log) {
  "use strict";

  //
  // The first bit of this module deals with unread items for the current troupe. The
  // second bit will deal with unread items for other troupes
  //
  var unreadItemsCountsCache = {};
  var unreadItems = window.troupePreloads && window.troupePreloads['unreadItems'] || {};

  var recentlyMarkedRead = {};

  window.setInterval(function() {
    var now = Date.now();

    _.keys(recentlyMarkedRead, function(key) {
      if(now - recentlyMarkedRead[key] > 5000) {
        delete recentlyMarkedRead[key];
      }
    });
  }, 5000);

  var syncCounts = function syncCounts() {
    var keys = _.union(_.keys(unreadItemsCountsCache), _.keys(unreadItems));

    _.each(keys, function(k) {
      var value = unreadItemsCountsCache[k];
      var newValue = unreadItems[k] ? unreadItems[k].length : 0;
      if(value !== newValue) {

        window.setTimeout(function() {
          $(document).trigger('itemUnreadCountChanged', {
            itemType: k,
            count: newValue
          });
        }, 200);
      }
    });
  };

  var readNotificationQueue = {};
  var timeoutHandle = null;

  var markItemRead = function markItemRead(itemType, itemId) {

    recentlyMarkedRead[itemType + "/" + itemId] = Date.now();

    var a = unreadItems[itemType];
    if(a) {
      a = _.without(a, itemId);
      unreadItems[itemType] = a;

      syncCounts();
    }

    if(!readNotificationQueue[itemType]) {
      readNotificationQueue[itemType] = [itemId];
    } else {
      readNotificationQueue[itemType].push(itemId);
    }

    function send() {
      timeoutHandle = null;

      var sendQueue = readNotificationQueue;
      readNotificationQueue = {};

      //log("Sending read notifications: ", sendQueue);

      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/unreadItems",
        contentType: "application/json",
        data: JSON.stringify(sendQueue),
        type: "POST",
        success: function() {
        }
      });
    }

    if(!timeoutHandle) {
      timeoutHandle = window.setTimeout(send, 500);
    }
  };

  var inFocus = true;
  $(window).on('blur', function() {
    inFocus = false;
  });

  $(window).on('focus', function() {
    inFocus = true;
    windowScroll();
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
          }, 2000);
          markItemRead(itemType, itemId);
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
    var itemTypes = _.keys(items);
    _.each(itemTypes, function(itemType) {
      var ids = items[itemType];

      var filtered = _.filter(ids, function(itemId) { return !recentlyMarkedRead[itemType + "/" + itemId]; });

      if(!unreadItems[itemType]) {
        unreadItems[itemType] = filtered;
      } else {
        unreadItems[itemType] = _.union(unreadItems[itemType], filtered);
      }

    });

    syncCounts();
  }

  function unreadItemsRemoved(items) {
    var itemTypes = _.keys(items);
    _.each(itemTypes, function(itemType) {
      var ids = items[itemType];

      if(unreadItems[itemType]) {
        unreadItems[itemType] = _.without(unreadItems[itemType], ids);
      }
    });

    syncCounts();
  }

  var unreadItemsClient = {
    getValue: function(itemType) {
      var v = unreadItems[itemType];
      return v ? v.length : 0;
    },

    findTopMostVisibleUnreadItem: function(itemType) {
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

      return topItem;
    },

    getTotalUnreadCountForCurrentTroupe: function() {
      var types = _.keys(unreadItems);

      var value = _.reduce(types, function(memo, type) {
        return memo + unreadItems[type].length;
      }, 0);

      return value;
    },

    installTroupeListener: function(troupeCollection) {
      var troupeUnreadTotal = -1, pplTroupeUnreadTotal = -1, normalTroupeUnreadTotal = -1;

      function recount() {
        function count(memo, troupe) {
          var count;
          if(troupe.id == window.troupeContext.troupe.id) {
            count = unreadItemsClient.getTotalUnreadCountForCurrentTroupe();
          } else {
            count = troupe.get('unreadItems');
          }

          return memo + (count > 0 ? 1 : 0);
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
        } else if(message.notification === 'unread_items') {
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


  return unreadItemsClient;
});
