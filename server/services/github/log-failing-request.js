/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var winston    = require('winston');

module.exports = exports = function(request) {
  return function requestWrapper(options, callback) {

    request(options, function (error, response, body) {
      if(error || response.statusCode >= 400) {
        winston.error("Error while communicating with GitHub", {
          statusCode: response.statusCode,
          uri: options.uri || options.url,
          message: body
        });
      }

      return callback(error, response, body);
    });
  };
};