define([
  'jquery',
  'utils/context',
  './webNotifications',
  './tmpl/request.hbs',
  './notifications'
], function($, context, webNotifications, template, notifications) {
  "use strict";

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

});
