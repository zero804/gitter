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
      }
    });
  }

  $(document).on('itemRead', function(event, data) {
    readNotificationQueue.push(data);
    if(!timeoutHandle) {
      timeoutHandle = window.setTimeout(send, 1000);
    }
  });

/*
  $(document).on('userLoggedOutOfTroupe', function(event, data) {
  });

  function refreshUnreadCounts() {
  }

  refreshUnreadCounts();
  window.setInterval(refreshUsers, 10 * 60 * 1000);

  return {
    isOnline: function(id) {
      if(id == window.troupeContext.user.id) {
        return true;
      }

      return onlineUsers[id] ? true : false;
    }
  };
*/

});
