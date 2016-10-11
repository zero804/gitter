"use strict";

var context = require('../utils/context');
var appEvents = require('../utils/appevents');
var ravenClientFactory = require('gitter-web-client-error-reporting/lib/raven-client-factory');

var user = context.user();

var ravenClient = ravenClientFactory({
  username: user && user.get('username')
});

// See https://github.com/troupe/gitter-webapp/issues/1056
// TODO: renable unhandled rejections
var REPORT_UNHANDLED_REJECTIONS = false;

if (REPORT_UNHANDLED_REJECTIONS) {
  // Report unhandled bluebird rejections
  // See http://bluebirdjs.com/docs/api/error-management-configuration.html#global-rejection-events
  window.addEventListener("unhandledrejection", function(e) {
      // NOTE: e.preventDefault() must be manually called to prevent the default
      // action which is currently to log the stack trace to console.warn
      e.preventDefault();

      var reason = e.detail.reason;
      ravenClient(reason);
  });

}

appEvents.on('bugreport', function(description, data) {
  appEvents.trigger('stats.event', 'error');
  ravenClient(description, data);
});
