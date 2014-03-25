/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var raven = require('raven');
var nconf = require('./config');
var winston = require('./winston');

if(!nconf.get('errorReporting:enabled')) {
  module.exports = function() { };
} else {
  var ravenUrl = nconf.get('errorReporting:ravenUrl');
  var client = new raven.Client(ravenUrl);

  client.on('error', function(e) {
    winston.error('Unable to log error to sentry:', {
      reason: e.reason,
      statusCode: e.statusCode
    });
  });

  module.exports = function(err, extra) {
    try {
      client.captureError(err, { extra: extra });
    } catch(e) {
      winston.error('Unable to log error to sentry:', {
        reason: e.reason,
        statusCode: e.statusCode
      });
    }
  };

}



