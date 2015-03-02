/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var winston = require('../../utils/winston');

module.exports = exports = function(request) {
  return function requestWrapper(options, callback) {

    request(options, function (error, response, body) {
      if(error || response && response.statusCode >= 400) {
        winston.error("Error while communicating with GitHub", {
          statusCode: response && response.statusCode,
          uri: options.uri || options.url,
          message: body
        });
      }

      return callback(error, response, body);
    });
  };
};
