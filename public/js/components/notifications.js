"use strict";
var appEvents = require('utils/appevents');

module.exports = (function() {


  var Notification = window.Notification;
  var webkitNotifications = window.webkitNotifications;

  function getPermissionType() {
    if(!Notification) return;

    // Notification.permission undefined in chrome 31 and earlier
    if(Notification.permission) {
      return Notification.permission;
    } else {
      switch(webkitNotifications.checkPermission()) {
        case 0: return "granted";
        case 1: return "default";
        case 2: return "denied";
      }
    }
  }

  function showNotification(message) {
    var link = message.link;
    var title = message.title;
    var text = message.text;
    var icon = '/images/icon-logo-red-64.png';

    var notification = new Notification(title, { body: text, icon: icon });

    notification.onshow = function() {
      setTimeout(function() {
        notification.close();
      }, 10000);
    };

    notification.onclick = function() {
      window.focus();
      if(link) {
        if(link == window.location.pathname) return;

        if(link.split('#')[0] == window.location.pathname) {
          window.location.replace('#' + link.split('#',2)[1]);
          return;
        }
        window.location.replace(link);
      }
    };
  }

  return {
    hasNotBeenSetup: function() {
      return getPermissionType() === 'default';
    },

    hasBeenDenied: function() {
      return getPermissionType() === 'denied';
    },

    hasBeenGranted: function() {
      return getPermissionType() === 'granted';
    },

    enable: function() {
      if(!Notification) return;

      if(getPermissionType() === 'granted') {
        // no need to request permission
        appEvents.on('user_notification', function(message) {
          showNotification(message);
        });
      } else {
        Notification.requestPermission(function() {
          appEvents.on('user_notification', function(message) {
            showNotification(message);
          });
        });
      }
    }
  };


})();

