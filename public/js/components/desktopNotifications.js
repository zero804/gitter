define([
  'jquery',
  'underscore'
], function($, _){
  /*global console: false document: false window:false*/
  "use strict";

  var module = {
    enabled: !!window.webkitNotifications,

    install: function() {
      if (window.webkitNotifications.checkPermission() !== 0) {
        window.webkitNotifications.requestPermission(module.listen); 
      } else {
        module.listen();
      }
    },

    listen: function() {
      var notification = null;
      var focus = true;
      var unacknowledgedNotificationCount = 0;

      $(window).focus(function() {
        focus = true;
      });

      $(window).focus(function() {
        focus = false;
      });

      function notificationHandler(event, data) {
        //if(!focus) {
          var nc = window.webkitNotifications;
          if(notification) {
            notification.cancel();
          }

          notification = nc.createNotification(null, "User has logged in", data.notificationText);
          notification.onclose = function() { 
            console.log("Notif onclose");
          };
          notification.onclick = function() { 
            console.log("Notif onclick");
          };
          notification.show();
        //}
      }

      //$(document).on('userLoggedIntoTroupe', notificationHandler);
      //$(document).on('userLoggedOutOfTroupe', notificationHandler);
      //$(document).on('chat', notificationHandler);
      $(document).on('notification', notificationHandler);
    }
  };

  if(module.enabled) {
    module.install();
  }

  return module;
});
