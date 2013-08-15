/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/appevents'
], function(appEvents){
  "use strict";

  var webkitNotifications = window.webkitNotifications;
  var Notification = window.Notification;

  function listenNotifications() {
    appEvents.on('user_notification', function(message) {
      var link = message.link;
      var title = message.title;
      var text = message.text;
      
      if(Notification) {
        var notification = new Notification(title, { body: text, tag: link, icon: '/images/2/logo-mark-green-square.png' });
        notification.onclick = function() {
          if(link) {
            window.location.href = link;
          }
        };        
      } else {
        var notification = webkitNotifications.createNotification('/images/2/logo-mark-green-square.png', title, text);
        notification.onclick = function() {
          if(link) {
            window.location.href = link;
          }
        };
        notification.show();
      }

    });
  }

  if(Notification) {
    switch(Notification.permission) {
      case 0:
        window.setTimeout(function() {
          Notification.requestPermission();     
          listenNotifications()
        }, 100);
        return;
      case 2:
        listenNotifications();
        return;
    }
  }

  if(webkitNotifications) {
    if (webkitNotifications.checkPermission() !== 0) {
      window.setTimeout(function() {
        window.webkitNotifications.requestPermission();
        listenNotifications();

      }, 100);
      
    } else {
      listenNotifications();
    }

    return;
  }



});
