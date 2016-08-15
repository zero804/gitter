"use strict";

var context = require('../utils/context');
var clientEnv = require('gitter-client-env');
var appEvents = require('../utils/appevents');
var Raven = require('raven-js');
var log = require('../utils/log');

var ravenUrl = clientEnv['ravenUrl'];

// See https://github.com/troupe/gitter-webapp/issues/1056
// TODO: renable unhandled rejections
var REPORT_UNHANDLED_REJECTIONS = false;

function normalise(s) {
  return s.replace(/\/_s\/\w+\//, '/_s/l/');
}

function logUnhandledError(message, filename, lineno, colno, error) {
  try {
    var stack = error && error.stack;
    /* V8 environments */
    if (stack) {
      if (message) {
        log.error(message);
      }

      log.error(stack);
      return;
    }

    // Non-V8 browsers
    var details = {
      message: message,
      filename: filename,
      lineno: lineno,
      colno: colno,
      error: error
    };

    // Remove undefined bits
    Object.keys(details).forEach(function(key) {
      if (!details[key]) delete details[key];
    });

    log.error(message || error && error.message || 'Unhandler error', details);
  } catch(e) {
    // Ignore: we don't want error-handlers creating errors
  }
}

if (REPORT_UNHANDLED_REJECTIONS) {
  // Report unhandled bluebird rejections
  // See http://bluebirdjs.com/docs/api/error-management-configuration.html#global-rejection-events
  window.addEventListener("unhandledrejection", function(e) {
      // NOTE: e.preventDefault() must be manually called to prevent the default
      // action which is currently to log the stack trace to console.warn
      e.preventDefault();

      var reason = e.detail.reason;
      appEvents.trigger('bugreport', reason);
  });

}

if(ravenUrl) {
  Raven.config(ravenUrl, {
      release: clientEnv['version'],
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
          /* */
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

      // Also log to the console
      logUnhandledError(undefined, undefined, undefined, undefined, description);
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
      logUnhandledError(undefined, undefined, undefined, undefined, description);
    } else {
      appEvents.trigger('stats.event', 'warning');
    }
  });

}
