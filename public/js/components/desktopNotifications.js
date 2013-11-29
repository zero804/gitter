/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/appevents',
  'utils/context',
  './eyeballs',
  './webNotifications',
  'hbs!./tmpl/request'
], function($, appEvents, context, eyeballs, webNotifications, template){
  "use strict";

  if(!context().desktopNotifications) {
    return;
  }

  var webkitNotifications = window.webkitNotifications;
  var Notification = window.Notification;

  function listen() {
    appEvents.on('user_notification', function(message) {
      // No notifications while eyeballs on
      if(eyeballs.getEyeBalls()) return;

      var link = message.link;
      var title = message.title;
      var text = message.text;
      var notification;

      function handleClick() {
        window.focus();
        if(link) {
          if(link == window.location.pathname) return;

          if(link.split('#')[0] == window.location.pathname) {
            window.location.replace('#' + link.split('#',2)[1]);
            return;
          }

          window.location.replace(link);

        }
      }

      if(Notification) {
        notification = new Notification(title, { body: text, tag: link, icon: '/images/2/gitter/logo-mark-blue-64.png' });
        notification.onshow = function() { setTimeout(function() { notification.close(); }, 10000); };
        notification.onclick = handleClick;
      } else {
        notification = webkitNotifications.createNotification('/images/2/gitter/logo-mark-blue-64.png', title, text);
        notification.onclick = handleClick;
        notification.show();
      }

    });
  }

  function checkPermission() {

    if(Notification && Notification.permission) {
      return Notification.permission;
    }

    if(webkitNotifications) {
      switch(webkitNotifications.checkPermission()) {
        case 0: return "default";
        case 1: return "denied";
        case 2: return "granted";
      }
    }

    return;
  }


  function request() {
    try {
      window.localStorage.notificationsPrompted = true;
    } catch(e) {
    }

    if(webkitNotifications && webkitNotifications.requestPermission) {
      webkitNotifications.requestPermission(listen);
    } else if(Notification && Notification.requestPermission) {
      Notification.requestPermission(listen);
    }
  }

  function prompt() {
    var e = $(template());

    e.find('#enable').on('click', function() {
      request();
      webNotifications.notify({
        id: 'request-notifications',
        action: 'hide'
      });
    });

    webNotifications.notify({
      id: 'request-notifications',
      content: e
    });
  }

  switch(checkPermission()) {
    case "granted": return listen();
    case "denied":
      if(!window.localStorage.notificationsPrompted) {
        prompt();
      }
      return;

    case "default": return listen();
  }


});
