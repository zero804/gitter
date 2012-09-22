define([
  'jquery',
  'underscore'
], function($, _) {
  /*global console: false, window: false, document: false */
  "use strict";

  var unreadItemsCache = window.troupeContext.unreadItemCounts ? window.troupeContext.unreadItemCounts : {};
  var unreadItemsDelayed = {};

  var readNotificationQueue = [];
  var timeoutHandle = null;

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
      dataType: "json",
      type: "POST",
      success: function(data) {
        console.log(data);
      }
    });
  }

  function notifyUpdates() {
    for(var k in unreadItemsCache) {
      if(unreadItemsCache.hasOwnProperty(k)) {
        var value = unreadItemsCache[k];
        var delayedValue = unreadItemsDelayed[k];
        if(value !== delayedValue) {
          unreadItemsDelayed[k] = value;

          $(document).trigger('itemUnreadCountChanged', {
            itemType: k,
            count: value
          });
        }
      }
    }
  }

  var updateHandle = null;
  function triggerCountUpdate() {
    if(!updateHandle) {
      updateHandle = window.setTimeout(function() {
        updateHandle = null;
        notifyUpdates();
      }, 500);
    }
  }

  $(document).on('datachange:*', function(event, data) {
    if(data.operation === 'create') {
      var itemType = data.modelName;
      var currentCount = unreadItemsCache[itemType];
      unreadItemsCache[itemType] =  currentCount ? currentCount + 1 : 1;
      triggerCountUpdate();
    }
  });

  function queueReadNotification(itemType, itemId) {
    unreadItemsCache[itemType] = unreadItemsCache[itemType] ? unreadItemsCache[itemType] - 1 : -1;
    triggerCountUpdate();

    readNotificationQueue.push({
      itemType: itemType,
      itemId: itemId
    });

    if(!timeoutHandle) {
      timeoutHandle = window.setTimeout(send, 1000);
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

  $(document).on('collectionAdd', function(event, data) {
    windowScrollOnTimeout();
  });

  notifyUpdates();

  return {
    getValue: function(itemType) {
      var v = unreadItemsCache[itemType];
      return v ? v : 0;
    }
  };

});
