/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var winston    = require('winston');


module.exports = exports = function(options, request) {
  var maxRetries = options.maxRetries || 4;
  var exponentialBackoffFactor = options.exponentialBackoffFactor || 1;

  return function requestWrapper(options, callback) {
    function attempt() {
      request(options, function (error, response, body) {
        if(error || response.statusCode >= 500) {
          retry++;

          if(retry <= maxRetries) {
            winston.error("Error while communicating with GitHub. Retrying in " + backoff + "ms", {
              statusCode: response && response.statusCode,
              uri: options.uri || options.url,
              error: error,
              message: body
            });

            backoff = backoff * (1 + exponentialBackoffFactor);
            return setTimeout(attempt, backoff);
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