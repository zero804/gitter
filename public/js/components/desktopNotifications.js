"use strict";
var $ = require('jquery');
var context = require('utils/context');
var webNotifications = require('./webNotifications');
var template = require('./tmpl/request.hbs');
var notifications = require('./notifications');

module.exports = (function() {


  if(!context().desktopNotifications) {
    return;
  }

  function prompt() {
    var e = $(template());

    e.find('#enable').on('click', function() {
      notifications.enable();
      webNotifications.notify({
        id: 'request-notifications',
        action: 'hide'
      });
    });

    webNotifications.notify({
      id: 'request-notifications',
      content: e,
      timeout: 10000
    });
  }

  if(notifications.hasNotBeenSetup()) {
    prompt();
  } else if(notifications.hasBeenGranted()) {
    notifications.enable();
  }


})();

