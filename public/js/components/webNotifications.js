'use strict';
var $ = require('jquery');
var context = require('../utils/context');
var template = require('./tmpl/notification.hbs');
var appEvents = require('../utils/appevents');
var urlParser = require('../utils/url-parser');
var linkHandler = require('./link-handler');

require('./notify');

module.exports = (function() {

  var $menuPanel = $('.room-menu__panel');
  // TODO: Remove the fallback after the left-menu has fully gone into production
  var $notificationCenterTarget = $menuPanel.length ? $menuPanel : $('.menu');
  var $notifyEl = $('<div id="notification-center" class="notification-center"></div>').appendTo($notificationCenterTarget);

  appEvents.on('user_notification', function(message) {
    if (message.troupeId && message.troupeId === context.getTroupeId()) {
      return;
    }

    var className = message.className;

    var element = $.parseHTML(template({
        link: message.link,
        title: message.title,
        text: message.text
      }));

    if(message.click) {
      $(element).on('click', message.click);
    } else if(message.link) {
      $(element).on('click', function(e) {
        var parsed = urlParser.parse(message.link);

        if (linkHandler.routeLink(parsed, { appFrame: true })) {
          e.preventDefault();
          e.stopPropagation();
        }
      });
    }

    $notifyEl.notify({
      content: element,
      className: className
    });
  });

  // websocket $notifyEl
  appEvents.on('app.version.mismatch', function() {
    $notifyEl.notify({
      content: "A new version of the application has been deployed. Click here to reload",
      click: function() {
        window.location.reload(true);
      }
    });
  });


  appEvents.on('ajaxError', function() {
    $notifyEl.notify({
      id: 'ajax-error',
      className: 'notification-error',
      content: "We're having problems communicating with the server at the moment...."
    });
  });


  return {
    notify: function(options) {
      $notifyEl.notify(options);
    }
  };


})();
