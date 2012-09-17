define([
  'jquery',
  'underscore'
], function($, _) {
  /*global console: false, window: false, document: false */
  "use strict";

  var unreadItemsCache = {};
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

          console.log("Item unread count changed", k, value);
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
      }, 1000);
    }
  }

  $(document).on('datachange:*', function(event, data) {
    if(data.operation === 'create') {
      var itemType = data.modelName;
      var currentCount = unreadItemsCache[itemType];
      unreadItemsCache[itemType] =  currentCount ? currentCount + 1 : 1;
      triggerCountUpdate();
    }

    console.log("A DATACHANGE HAPPENED!", unreadItemsCache);
  });

  $(document).on('itemRead', function(event, data) {
    var itemType = data.itemType;
    unreadItemsCache[itemType] = unreadItemsCache[itemType] ? unreadItemsCache[itemType] - 1 : -1;
    triggerCountUpdate();

    console.log("An item was read", unreadItemsCache);

    readNotificationQueue.push(data);
    if(!timeoutHandle) {
      timeoutHandle = window.setTimeout(send, 1000);
    }
  });

  var windowTimeout = null;

  function windowScrollOnTimeout() {
    windowTimeout = null;
    var $window = $(window);
    var $document = $(document);
    var scrollTop = $window.scrollTop();
    var scrollBottom = scrollTop + $window.height();
    var vpH = $document.height();

    $.each($('.unread:visible'), function (index, element) {
      var $e = $(element);
      var itemType = $e.data('itemType');
      var itemId = $e.data('itemId');

      $e.removeClass('unread');

      if(itemType && itemId) {
        var top = $e.offset().top;
        var height = $e.height();

        // TODO: fix this, it's not quite right
        if (scrollTop < (top + height)) {
          $document.trigger('itemRead', {
            itemType: itemType,
            itemId: itemId
          });
        }
      }

    });
  }

  function windowScroll() {
    if(!windowTimeout) {
      windowTimeout = window.setTimeout(windowScrollOnTimeout, 250);
    }
  }

  $(window).on('scroll', windowScroll);

  $(document).on('collectionReset', function(event, data) {
    windowScrollOnTimeout();
  });

  $(document).on('collectionAdd', function(event, data) {
    windowScrollOnTimeout();
  });

});
