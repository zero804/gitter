define([
  'jquery',
  'underscore'
], function($, _) {
  /*global console: false, window: false, document: false */
  "use strict";

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

  $(document).on('itemRead', function(event, data) {
    console.log("UNREAD", data);

    readNotificationQueue.push(data);
    if(!timeoutHandle) {
      timeoutHandle = window.setTimeout(send, 2000);
    }
  });

  var windowTimeout = null;

  function windowScrollOnTimeout() {
    windowTimeout = null;
    var $window = $(window);
    var scrollTop = $window.scrollTop();
    var scrollBottom = scrollTop + $window.height();
    var vpH = $(document).height();

    $.each($('.unread:visible'), function (index, element) {
      var $e = $(element);
      var itemType = $e.data('itemType');
      var itemId = $e.data('itemId');

      $e.removeClass('unread');

      if(itemType && itemId) {
        var top = $e.offset().top;
        var height = $e.height();

        if (scrollTop < (top + height)) {
          $(document).trigger('itemRead', {
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
});
