/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  './realtime',
  'handlebars'
], function($, _ , realtime, handlebars){
  "use strict";

  $.prototype.notify = function(options) {
    var container = this;
    var content = options.content;
    var timeout = options.timeout ? options.timeout : 4000;
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
    n.addClass('notification-container');

    // setup the timeouts data storage if necessary
    if (!container.data('timeouts')) {
      var t = []; t.running = true;
      container.data('timeouts', t);
    }

    // attach handlers on the notification-center container
    var timeouts = container.data('timeouts');
    this.on('mouseenter', /* '.notification',*/ function(e) {
      if (timeouts.running === true && e.currentTarget === container[0]) {
        // console.log('cancelling timeouts', e);
        // cancel all hide timeouts
        timeouts.running = false;
        _.each(timeouts, function(t) {
          t.pause();
        });
      }
    });
    this.on('mouseleave', /* '.notification',*/ function(e) {
      if (timeouts.running === false && e.currentTarget === container[0]) {
        // console.log('resuming timeouts', e);
        // restart all the hide timeouts
        timeouts.running = true;
        _.each(timeouts, function(t) {
          t.resume(1000);
        });
      }
    });

    // replace the content
    n.html(content);

    // add & animate the element if it is new
    if (isNew) {
      n.appendTo(container);
    }
    if (n.is(':hidden')) {
      n.slideDown();
    }

    // add the hide timeout for this notification
    timeouts.push(new Timeout(function() {
      n.slideUp();
    }, timeout));
  };

  // Timeout util
  function Timeout(callback, delay) {
    var timerId, start, remaining = delay;

    this.pause = function() {
      window.clearTimeout(timerId);
      remaining -= new Date() - start;
    };

    this.resume = function(add) {
      start = new Date();
      remaining += (add) ? add : 0;
      timerId = window.setTimeout(callback, remaining);
    };

    this.restart = function() {
      start = new Date();
      remaining = delay;
      timerId = window.setTimeout(callback, remaining);
    };

    this.resume();
  }

  var notifications = $('<div id="notification-center" class="notification-center"></div>').appendTo('body');

  // notifications for cross troupe chat messages
  realtime.subscribe('/user/' + window.troupeContext.user.id, function(message) {
    if (message.notification === 'user_notification') {
      // console.log("Got a user_notification event");
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

  // one notification when the connection to server is down
  // todo: this might also show when an invalid user operation is attempted.
  $(document).ajaxError(function() {
    notifications.notify({
      id: 'ajax-error',
      className: 'notification-error',
      content: "We're having problems communicating with the server at the moment...."
    });
  });

  /* testing:
  setTimeout(function() {
    notifications.notify({ content: "abcdefg" });
  }, 0);
  setTimeout(function() {
    notifications.notify({ content: "abcdefg" });
  }, 1000);
  setTimeout(function() {
    notifications.notify({ content: "abcdefg" });
  }, 2000);
  */

});
