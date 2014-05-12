/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env = require('../../utils/env');
var logger         = env.logger;
var stats          = env.stats;
var errorReporter  = env.errorReporter;
var _              = require('underscore');

/* Has to have four args */
module.exports = function(err, req, res, next) {
  var user = req.user;
  var userId = user && user.id;

  var status = 500;
  var template = '500';
  var message = "An unknown error occurred";
  var stack = err && err.stack;

  if(_.isNumber(err)) {
   if(err > 400) {
     status = err;
     message = 'HTTP ' + err;
   }
  } else {
   if(_.isNumber(err.status)) {
     status = err.status;
   }

   if(err.message) {
     message = err.message;
   }
  }

  if(status >= 500) {
   // Send to sentry
   errorReporter(err, { type: 'response', status: status, userId: userId, url: req.url, method: req.method });
   // Send to statsd
   stats.event('client_error_5xx', { userId: userId });

   logger.error("An unexpected error occurred", {
     path: req.path,
     message: message
   });

   if(err.stack) {
     logger.error('Error: ' + err.stack);
   }

  } else if(status === 404) {
   stats.event('client_error_404', { userId: userId });

   template = '404';
   stack = null;
  } else if(status >= 400 && status < 500) {
   stats.event('client_error_4xx', { userId: userId });
  }
  res.status(status);
  res.send({ error: message });
};