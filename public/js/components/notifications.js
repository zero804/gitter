"use strict";

var appEvents           = require('utils/appevents');
var cdn                 = require('../utils/cdn');
var WindowNotification  = window.Notification;
var webkitNotifications = window.webkitNotifications;
var urlParser           = require('../utils/url-parser');
var linkHandler         = require('./link-handler');
var resolveAvatarUrl    = require('gitter-web-shared/avatars/resolve-avatar-url');

var notificationsHaveBeenEnabled = false;

function getPermissionType() {
  if(!WindowNotification) return;

  // Notification.permission undefined in chrome 31 and earlier
  if(WindowNotification.permission) {
    return WindowNotification.permission;
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
  var icon = message.icon || cdn('images/icon-logo-red-64.png');

  var notification = new WindowNotification(title, { body: text, icon: icon });

  setTimeout(function() {
    notification.close();
  }, 10000);

  notification.onclick = function() {
    window.focus();
    if (!link) return;

    var parsed = urlParser.parse(link);
    linkHandler.routeLink(parsed, { appFrame: true });
  };
}


function initNotifications(){
  //if enable has already been called bail
  if(notificationsHaveBeenEnabled) return;

  //track that this has previously been called
  notificationsHaveBeenEnabled = true;

  //subscribe to notifications
  appEvents.on('user_notification', function(message) {
    showNotification(message);
  });
}


module.exports = {
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
    if(!WindowNotification) return;

    if(getPermissionType() === 'granted') {
      initNotifications();
    } else {
      WindowNotification.requestPermission(function() {
        initNotifications();
      });
    }
  }
};
