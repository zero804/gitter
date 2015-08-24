"use strict";
var context = require('utils/context');
var appEvents = require('utils/appevents');
var Raven = require('raven-js');
var log = require('utils/log');

module.exports = (function() {
  var ravenUrl = context.env('ravenUrl');

  function normalise(s) {
    return s.replace(/\/_s\/\w+\//, '/_s/l/');
  }

  function logUnhandledError(message, filename, lineno, colno, error) {
    log.error(message || error && error.message || 'Unhandler error', {
        message: message,
        filename: filename,
        lineno: lineno,
        colno:colno,
        error: error
      });
  }

  if(ravenUrl) {
    Raven.config(ravenUrl, {
        release: context.env('version'),
        // # we highly recommend restricting exceptions to a domain in order to filter out clutter
        // whitelistUrls: ['example.com/scripts/']
        dataCallback: function(data) {
          try {
            data.stacktrace.frames.forEach(function(frame) {
              if(frame.filename) {
                frame.filename = normalise(frame.filename);
              }
            });

            if(data.culprit) {
              data.culprit = normalise(data.culprit);
            }

            appEvents.trigger('stats.event', 'error');

          } catch(e) {
          }


          return data;
        }
    }).install();

    var user = context.user();
    Raven.setUser({
      username: user && user.get('username')
    });

    appEvents.on('bugreport', function(description, data) {
      if(description instanceof Error) {
        appEvents.trigger('stats.event', 'error');
        Raven.captureException(description, data);
      } else {
        appEvents.trigger('stats.event', 'warning');
        Raven.captureMessage(description, data);
      }
    });

  } else {
    window.onerror = function (message, filename, lineno, colno, error) {
      try {
        logUnhandledError(message, filename, lineno, colno, error);
        appEvents.trigger('stats.event', 'error');
      } catch(e) {
        window.onerror = null;
        throw e;
      }
    };

    /* No raven here please */
    appEvents.on('bugreport', function(description) {
      if(description instanceof Error) {
        appEvents.trigger('stats.event', 'error');
      } else {
        appEvents.trigger('stats.event', 'warning');
      }
    });

  }




})();
