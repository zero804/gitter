
/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var logger = require('gitter-web-env').logger;
var obfuscateToken = require('./obfuscate-token');
var _ = require('lodash');

function sanitizeUri(uri) {
  // TODO: what if someone put the access_token, client_id or client_secret in
  // the query string?
  return uri;
}

function sanitizeHeaders(headers) {
  var cloned = _.clone(headers);

  if (cloned.Authorization) {
    var parts = cloned.Authorization.split(' ');
    if (parts.length == 2 && parts[0] == 'token') {
      cloned.Authorization = 'token ' + obfuscateToken(parts[1]);
    }
  }

  return cloned;
}

module.exports = function(options, callback, request) {
  if (options.logRequest) {
    logger.info('Request to GitHub', {
      method: options.method,
      uri: sanitizeUri(options.uri || options.url),
      headers: sanitizeHeaders(options.headers)
    });
  }
  request(options, function(error, response, body) {
    if (options.logRequest && !error) {
      logger.info('Response from GitHub', {
        statusCode: response && response.statusCode,
        uri: options.uri || options.url,
        message: body
      });
    }
    callback(error, response, body);
  });
};
