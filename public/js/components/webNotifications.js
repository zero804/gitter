/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context',
  'hbs!./tmpl/notification',
  'utils/appevents',
  'log!web-notifications',
  'require',
  './notify'                              // No reference,
], function($, context, template, appEvents, log, require){
  "use strict";

  var notifications = $('<div id="notification-center" class="notification-center"></div>').appendTo('body');

  appEvents.on('user_notification', function(message) {
    if(message.troupeId && message.troupeId === context.getTroupeId()) {
      return;
    }

    var element = $.parseHTML(template({
        link: message.link,
        title: message.title,
        text: message.text
      }));

    if(message.click) {
      $(element).on('click', message.click);
    } else if(message.link) {
      $(element).on('click', function() {
        window.location.href = message.link;
      });
    }

    notifications.notify({
      content: element
    });
  });


  // $(document).on('app.version.mismatch', function() {
  //   notifications.notify({
  //     id: 'app-update',
  //     className: 'notification',
  //     content: "<a href=\"javascript:window.location.reload()\">There is a new version of Gitter available. Click here to refresh.</a>"
  //   });
  // });

  // one notification when the connection to server is down
  // todo: this might also show when an invalid user operation is attempted.
  $(document).ajaxError(function(ev, jqxhr, settings /*, exception*/) {
    require(['utils/tracking'], function(tracking) {
      tracking.trackError("Ajax Error", settings.url, jqxhr.status);
    });

    if(jqxhr.status >= 400 && jqxhr.status < 500) {
      // 400 errors are the problem of the ajax caller, not the global handler
      return;
    }

    notifications.notify({
      id: 'ajax-error',
      className: 'notification-error',
      content: "We're having problems communicating with the server at the moment...."
    });
  });

  // // websocket notifications
  // $(document).on('realtime:persistentOutage', function() {
  //   log('realtime:persistentOutage');
  //   notifications.notify({
  //     id: 'realtime-error',
  //     className: 'notification-error',
  //     content: "We're having problems with our realtime connection at present.",
  //     timeout: Infinity
  //     /* TODO: make this persistent and clear it when the persistentOutageCleared event occurs */
  //   });
  // });

  // $(document).on('realtime:persistentOutageCleared', function() {
  //   log('realtime:persistentOutageCleared');
  //   notifications.notify({
  //     id: 'realtime-error',
  //     action: 'hide'
  //   });
  // });


  $(window).on('beforeunload', function(){
    $('#notification-center').hide();
  });

  return {
    notify: function(options) {
      notifications.notify(options);
    }
  };

});
