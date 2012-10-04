define([
  'jquery',
  'underscore'
], function($, _) {
  /*global console: false, window: false, document: false */
  "use strict";

  var unreadItemsCache = {};

  function syncCounts(newValues) {

    var keys = [];
    var i;
    for(i in newValues) if (newValues.hasOwnProperty(i)) keys.push(i);
    for(i in unreadItemsCache) if (unreadItemsCache.hasOwnProperty(i)) keys.push(i);

    for(i = 0; i < keys.length; i++) {
      var k = keys[i];
      var value = unreadItemsCache[k];
      var newValue = newValues[k];
      if(value !== newValue) {
        unreadItemsCache[k] = newValue;

        $(document).trigger('itemUnreadCountChanged', {
          itemType: k,
          count: newValue
        });
      }
    }
  }

  var readNotificationQueue = [];
  var timeoutHandle = null;
  function queueReadNotification(itemType, itemId) {

    function send() {
      timeoutHandle = null;
      if(!readNotificationQueue) {
        return;
      }

      var sendQueue = readNotificationQueue;
      readNotificationQueue = [];

      console.log("Sending read notifications: ", sendQueue);

      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/unreadItems",
        contentType: "application/json",
        data: JSON.stringify(sendQueue),
        type: "POST",
        success: function() {
          // TODO: sort this out
          console.log("done");
        }
      });
    }


    readNotificationQueue.push({
      itemType: itemType,
      itemId: itemId
    });

    if(!timeoutHandle) {
      timeoutHandle = window.setTimeout(send, 1000);
    }
  }

  var fetchTimeout = null;
  function fetchCounts() {

    function fetchCountsOnTimeout() {
      fetchTimeout = null;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/unreadItems",
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        success: function(newUnreadCounts) {
          // TODO: sort this out
          syncCounts(newUnreadCounts);
          console.log(newUnreadCounts);
        }
      });
    }

    if(!fetchTimeout) {
      fetchTimeout = window.setTimeout(fetchCountsOnTimeout, 500);
    }
  }

  var windowTimeout = null;

  function windowScrollOnTimeout() {
    windowTimeout = null;
    var $window = $(window);
    var $document = $(document);
    var scrollTop = $window.scrollTop();
    var scrollBottom = scrollTop + $window.height();

    $.each($('.unread:visible'), function (index, element) {
      var $e = $(element);
      var itemType = $e.data('itemType');
      var itemId = $e.data('itemId');

      if(itemType && itemId) {
        var top = $e.offset().top;

        if (top >= scrollTop && top <= scrollBottom) {
          $e.removeClass('unread');
          $e.addClass('read');

          console.log("Found unread item within display view", itemType, itemId);
          queueReadNotification(itemType, itemId);
        }
      }

    });
  }

  function windowScroll() {
    if(!windowTimeout) {
      windowTimeout = window.setTimeout(windowScrollOnTimeout, 90);
    }
  }

  $(window).on('scroll', windowScroll);

  $(document).on('collectionReset', function(event, data) {
    windowScrollOnTimeout();
  });

  $(document).on('troupeUnreadCountsChange', function(event, data) {
    syncCounts(data.counts);
  });

  $(document).on('collectionAdd', function(event, data) {
    windowScrollOnTimeout();
  });

  syncCounts(window.troupeContext.unreadItemCounts ? window.troupeContext.unreadItemCounts : {});

  return {
    getValue: function(itemType) {
      var v = unreadItemsCache[itemType];
      return v ? v : 0;
    }
  };

});
