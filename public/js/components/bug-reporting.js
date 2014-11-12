"use strict";
var context = require('utils/context');
var appEvents = require('utils/appevents');
var Raven = require('raven');

module.exports = (function() {
  var ravenUrl = context.env('ravenUrl');

  function normalise(s) {
    return s.replace(/\/_s\/\w+\//, '/_s/l/');
  }

  function logUnhandledError(message, filename, lineno, colno, error) {
    var c = window['con' /* prevent detector */ + 'sole'];
    if(c) {
      var m = message || error && error.message || 'Unhandler error';
      var errorInfo = {
        message: message,
        filename: filename,
        lineno: lineno,
        colno:colno,
        error: error
      };

      if(c.error) {
        c.error(m, errorInfo);
        if(error && error.stack) {
          c.error(error.stack);
        }
      } else if(c.log) {
        c.log(m, errorInfo);
        if(error && error.stack) {
          c.log(error.stack);
        }
      }
    }
  }

  if(ravenUrl) {
    Raven.config(ravenUrl, {
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
          } catch(e) {
          }

          return data;
        }
    }).install();

    var user = context.user();
    Raven.setUser({
      username: user && user.get('username')
    });

    window.onerror = function (message, filename, lineno, colno, error) {
      try {
        logUnhandledError(message, filename, lineno, colno, error);
        appEvents.trigger('stats.event', 'error');

        if(error instanceof Error) {
          Raven.captureException(error, { message: message, filename: filename, lineno: lineno, colno: colno });
        } else {
          Raven.captureMessage(message, { message: message, filename: filename, lineno: lineno, colno: colno });
        }
      } catch(e) {
        window.onerror = null;
        throw e;
      }
    };

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

