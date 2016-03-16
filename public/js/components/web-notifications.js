"use strict";

var $        = require('jquery');
var template = require('./tmpl/notification.hbs');

require('./notify');

var $menuPanel = $('.room-menu__panel');
// TODO: Remove the fallback after the left-menu has fully gone into production
var $notificationCenterTarget = $menuPanel.length ? $menuPanel : $('.menu');
var $notifyEl = $('<div id="notification-center" class="notification-center"></div>').appendTo($notificationCenterTarget);

function show(message, callback) {
  var className = message.className; // DEPRECATED

  var element = $.parseHTML(template({
      link: message.link,
      title: message.title,
      text: message.text
    }));

  $notifyEl.notify({
    content: element,
    className: className
  });

  $(element).on('click', function(e) {
    if (callback && callback(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

}

module.exports = {
  show: show
};
