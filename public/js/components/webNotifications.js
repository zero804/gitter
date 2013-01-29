/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  './realtime',
  'handlebars'
], function($, _ , realtime, handlebars){
  "use strict";

  var notifications = $('<div id="notification-center" class="notification-center"></div>').appendTo('body');

  $.prototype.notification = function(options) {
    var container = this;
    var content = options.content;
    var timeout = options.timeout ? options.timeout : 5000;

    var n = $('<div class="notification"></div>');
    n.html(content);
    n.hide().appendTo(container).show('slow');
    setTimeout(function() {
      n.hide();
    }, timeout);
  };

  realtime.subscribe('/user/' + window.troupeContext.user.id, function(message) {
    if (message.notification === 'user_notification') {
      var tmpl = handlebars.compile('<a href="{{link}}">{{{title}}}: {{{text}}}');
      notifications.notification({
        content: tmpl({
          link: message.link,
          title: message.title,
          text: message.text
        })
      });
    }
  });

});
