/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var winston = require('../../utils/winston');
var statsService = require('../stats-service');

module.exports = exports = function(options, request) {
  var maxRetries = options.maxRetries || 4;
  var exponentialBackoffFactor = options.exponentialBackoffFactor || 1;

  return function requestWrapper(options, callback) {
    function attempt() {
      var start = Date.now();

      statsService.event('github.api.count');

      request(options, function (error, response, body) {
        var duration = Date.now() - start;
        statsService.responseTime('github.api.response.time', duration);

        if(error || response.statusCode >= 500) {
          retry++;

          if(retry <= maxRetries) {
            winston.error("Error while communicating with GitHub. Retrying in " + backoff + "ms", {
              statusCode: response && response.statusCode,
              uri: options.uri || options.url,
              error: error,
              message: body
            });

            statsService.event('github.api.error.retry');

            backoff = backoff * (1 + exponentialBackoffFactor);
            return setTimeout(attempt, backoff);
          } else {
            statsService.event('github.api.error.abort');
          }
        }

        return callback(error, response, body);
      });
    }

    var retry = 0;
    var backoff = 1;
    attempt(options, callback);
  };
};
