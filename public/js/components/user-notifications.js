'use strict';

var appEvents           = require('utils/appevents');
var cdn                 = require('../utils/cdn');
var context             = require('../utils/context');
var WindowNotification  = window.Notification;
var webkitNotifications = window.webkitNotifications;
var urlParser           = require('../utils/url-parser');
var linkHandler         = require('./link-handler');
var onReady             = require('../utils/onready');
var webNotifications    = require('./web-notifications');
var sessionMutex        = require('../utils/session-mutex');

/**
 * Returns "granted", "denied", "default" or undefined
 */
function getDesktopNotificationAccess() {
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

function showDesktopNotification(message, callback) {
  var title = message.title;
  var text = message.text;
  var icon = message.icon || cdn('images/icon-logo-red-64.png');

  var notification = new WindowNotification(title, { body: text, icon: icon });

  setTimeout(function() {
    notification.close();
  }, 10000);

  notification.onclick = function() {
    window.focus();
    callback(message);
  };
}

/**
 * Returns true if propogation should be cancelled
 */
function onNotificationMessageClicked(message) {
  if (message.click) {
    message.click();
    return true;
  }

  if (message.link) {
    var parsed = urlParser.parse(message.link);

    return linkHandler.routeLink(parsed, { appFrame: true });
  }

  return true;
}

function onUserNotificationWithLock(message) {
  if (getDesktopNotificationAccess() === 'granted') {
    showDesktopNotification(message, onNotificationMessageClicked);
  } else {
    webNotifications.show(message, onNotificationMessageClicked);
  }
}


function onUserNotification(message) {
  if (message.notificationKey) {
    sessionMutex(message.notificationKey)
      .then(function(lockObtained) {
        if (lockObtained) {
          onUserNotificationWithLock(message);
        }
      });
  } else {
    onUserNotificationWithLock(message);
  }

}

function initUserNotifications() {
  //subscribe to notifications
  appEvents.on('user_notification', onUserNotification);

  appEvents.on('app.version.mismatch', function() {
    appEvents.trigger('user_notification', {
      notificationKey: 'app.version.mismatch',
      title: 'A new version of Gitter is available',
      text: 'Click here to reload',
      click: function() {
        try {
          window.parent.location.reload(true);
        } catch(e) {
          window.location.reload(true);
        }
      }
    });
  });

  appEvents.on('ajaxError', function() {
    appEvents.trigger('user_notification', {
      notificationKey: 'ajax.error',
      title: 'Unable to communicate with Gitter',
      text: "We're having problems communicating with the server at the moment....",
      click: function() {
        try {
          window.parent.location.reload(true);
        } catch(e) {
          window.location.reload(true);
        }
      }
    });
  });
}

initUserNotifications();

function requestDesktopNotificationAccess() {
  if(!WindowNotification) return;
  if (getDesktopNotificationAccess() === "granted") return;

  WindowNotification.requestPermission(function() {
  });
}

onReady(function() {
  requestDesktopNotificationAccess();
});

module.exports = {
  requestAccess: requestDesktopNotificationAccess,
  isAccessDenied: function() {
    return getDesktopNotificationAccess() === "denied";
  }
};
