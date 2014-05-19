/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var winston    = require('../../utils/winston');

module.exports = exports = function(request) {
  return function requestWrapper(options, callback) {

    request(options, function (error, response, body) {
      if(response && response.headers) {
        var remaining = response.headers['x-ratelimit-remaining'];
        if(remaining) {
          remaining = parseInt(remaining, 10);

          if(!isNaN(remaining)) {
            if(remaining < 300) {

              winston.warn("Rate limit is down to " + remaining, {
                options: options,
                reset: response.headers['x-ratelimit-reset'],
                limit: response.headers['x-ratelimit-limit']
              });

            }
          }
        }
      }

      return callback(error, response, body);
    });
  };
};
