define([
  'jquery',
  'underscore'
], function($, _) {
  /*global console: false, window: false, document: false */
  "use strict";

  var unreadItemsCountsCache = {};
  var unreadItems = window.troupeContext.unreadItems;

  function syncCounts() {
    var keys = _.union(_.keys(unreadItemsCountsCache), _.keys(unreadItems));

    keys.forEach(function(k) {
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
  }

  var readNotificationQueue = {};
  var timeoutHandle = null;
  function markItemRead(itemType, itemId) {
    var a = unreadItems[itemType];
    if(a) {
      unreadItems[itemType] = _.without(a, itemId);
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

      console.log("Sending read notifications: ", sendQueue);

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

          markItemRead(itemType, itemId);
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

  $(document).on('newUnreadItems', function(event, data) {
    var itemTypes = _.keys(data);
    _.each(itemTypes, function(itemType) {
      var ids = data[itemType];

      if(!unreadItems[itemType]) {
        unreadItems[itemType] = ids;
      } else {
        unreadItems[itemType] = _.union(unreadItems[itemType], ids);
      }
    });

    syncCounts();
  });


  $(document).on('unreadItemsRemoved', function(event, data) {
    var itemTypes = _.keys(data);
    _.each(itemTypes, function(itemType) {
      var ids = data[itemType];

      if(unreadItems[itemType]) {
        unreadItems[itemType] = _.without(unreadItems[itemType], ids);
      }
    });

    syncCounts();
  });

  $(document).on('collectionAdd', function(event, data) {
    windowScrollOnTimeout();
  });

  return {
    getValue: function(itemType) {
      var v = unreadItems[itemType];
      return v ? v.length : 0;
    }
  };

});
