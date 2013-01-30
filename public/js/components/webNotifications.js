/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  './realtime',
  'handlebars'
], function($, _ , realtime, handlebars){
  "use strict";

  var notifications = $('<div id="notification-center" class="notification-center"></div>').appendTo('body');

  $.prototype.notify = function(options) {
    var container = this;
    var content = options.content;
    var timeout = options.timeout ? options.timeout : 5000;
    var className = options.className ? options.className : '';
    var n, isNew = false;

    // lookup or create the notification element
    if (options.id)
      n = this.find('#'+options.id);

    if (!options.id || n.length <= 0) {
      isNew = true;
      n = $('<div class="notification"'+((options.id) ? ' id="'+options.id+'"':'')+'></div>').hide();
    }

    // ensure the requested class is on the element
    if (className)
      n.addClass(className);
    // replace the content
    n.html(content);
    // add & animate the element if it is new
    if (isNew) {
      n.appendTo(container);
    }
    if (n.is(':hidden')) {
      n.slideDown();
    }
    // TODO keep track of all the timeouts and cancel the previous one for this notification
    setTimeout(function() {
      n.slideUp();
    }, timeout);
  };

  realtime.subscribe('/user/' + window.troupeContext.user.id, function(message) {
    if (message.notification === 'user_notification') {
      var tmpl = handlebars.compile('<a href="{{link}}">{{{title}}}: {{{text}}}');
      notifications.notify({
        content: tmpl({
          link: message.link,
          title: message.title,
          text: message.text
        })
      });
    }
  });

  $(document).ajaxError(function(event) {
    notifications.notify({
      id: 'ajax-error',
      className: 'notification-error',
      content: "We're having problems communicating with the server at the moment...."
    });
  });

});
