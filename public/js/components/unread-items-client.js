/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  './realtime'
], function($, _, realtime) {
  /*global console: false, window: false, document: false */
  "use strict";

  var troupeUnreadCounts = {};
  var troupeUnreadTotal = -1;


  var unreadItemsCountsCache = {};
  var unreadItems = window.troupeContext.unreadItems;
  var recentlyMarkedRead = {};

  function log(fun) {
    return function() {
      //console.log("Calling " + fun.name, arguments);
      var r = fun.apply(null, arguments);
      //console.log("Completed " + fun.name, r);
      return r;
    };
  }

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

        //console.log("Unread items of type: ", k, newValue, "old value was ", value);

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
      var lengthBefore = a.length;
      a = _.without(a, itemId);
      unreadItems[itemType] = a;
      if(a.length !== lengthBefore - 1) {
        //console.log("Item " + itemType + "/" + itemId + "marked as read, but not found in unread items.");
      }

      syncCounts();
    } else {
      //console.log("No unread items of type " + itemType + " found.");
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

      //console.log("Sending read notifications: ", sendQueue);

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

  var windowTimeout = null;
  var windowScrollOnTimeout = function windowScrollOnTimeout() {
    windowTimeout = null;
    var $window = $(window);
    var scrollTop = $window.scrollTop();
    var scrollBottom = scrollTop + $window.height();

    $('.unread').each(function (index, element) {
      var $e = $(element);
      var itemType = $e.data('itemType');
      var itemId = $e.data('itemId');

      //console.log("found an unread item: itemType ", itemType, "itemId", itemId);

      if(itemType && itemId) {
        var top = $e.offset().top;

        if (top >= scrollTop && top <= scrollBottom) {
          $e.removeClass('unread');
          $e.addClass('read');

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

  // TODO: don't reference this frame directly!
  $('#toolbar-frame').on('scroll', windowScroll);

  $(document).on('unreadItemDisplayed', function() {
    windowScroll();
  });

  $(document).on('appNavigation', function() {
    windowScroll();
  });
/*
  $(document).on('collectionReset', function() {
    windowScroll();
  });

  $(document).on('collectionAdd', function() {
    windowScroll();
  });
*/

  function newUnreadItems(items) {
    var itemTypes = _.keys(items);
    _.each(itemTypes, function(itemType) {
      var ids = items[itemType];

      var filtered = _.filter(ids, function(itemId) { return !recentlyMarkedRead[itemType + "/" + itemId]; });

      if(filtered.length < ids.length) {
        //console.log("Some items have been marked as read before they even appeared");
      }

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


  //windowScrollOnTimeout = log(windowScrollOnTimeout);
  unreadItemsRemoved = log(unreadItemsRemoved);
  newUnreadItems = log(newUnreadItems);
  syncCounts = log(syncCounts);
  markItemRead = log(markItemRead);

  return {
    getValue: function(itemType) {
      var v = unreadItems[itemType];
      return v ? v.length : 0;
    },

    installTroupeListener: function(troupeCollection) {
      function recount() {
          var newTroupeUnreadTotal = _(troupeUnreadCounts)
                .values()
                .map(function(a) { return a > 0 ? 1: 0; })
                .reduce(function(a,b) { return a + b; });

          if(newTroupeUnreadTotal !== troupeUnreadTotal) {
            troupeUnreadTotal = newTroupeUnreadTotal;
            $(document).trigger('troupeUnreadTotalChange', newTroupeUnreadTotal);
          }
      }

      if (troupeCollection) {
        troupeCollection.on('reset', function() {
          troupeCollection.each(function(troupe) {
            troupeUnreadCounts[troupe.id] = troupe.get('unreadItems');
          });
          recount();
        });
      }

      realtime.subscribe('/user/' + window.troupeContext.user.id, function(message) {
        if(message.notification === 'troupe_unread') {
          var troupeId = message.troupeId;
          var totalUnreadItems = message.totalUnreadItems;

          troupeUnreadCounts[troupeId] = totalUnreadItems;
          var model = (troupeCollection) ? troupeCollection.get(troupeId) : null;
          if(model) {
            model.set('unreadItems', totalUnreadItems);
          } else {
            console.log("Cannot find model. Refresh might be required....");
          }
          recount();
        } else if(message.notification === 'unread_items') {
          newUnreadItems(message.items);
        } else if(message.notification === 'unread_items_removed') {
          unreadItemsRemoved(message.items);
        }
      });
    }
  };

});
