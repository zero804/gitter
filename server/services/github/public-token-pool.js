/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var url = require('url');
var nconf = require('../../utils/config');
var env = require('../../utils/env');
var stats = env.stats;

var anonymousClientId = nconf.get('github:anonymous_app:client_id');
var anonymousClientSecret = nconf.get('github:anonymous_app:client_secret');

module.exports = exports = function(request) {
  return function requestWrapper(options, callback) {

    var accessToken;
    if (options.headers) {
      accessToken = options.headers.Authorization || options.headers.authorization;
    }

    var parsed;
    if (!accessToken) {
      parsed = url.parse(options.uri || options.url, true);
      accessToken = parsed.query.access_token;
    }

    if(!accessToken) {
      stats.eventHF('github.anonymous.access');

      if (!parsed) parsed = url.parse(options.uri || options.url, true);

      /* Only GET requests thanks */
      parsed.query.client_id = anonymousClientId;
      parsed.query.client_secret = anonymousClientSecret;
      delete parsed.query.access_token;
      delete parsed.search;

      var uri = url.format(parsed);

      if(options.uri) {
        options.uri = uri;
      } else if(options.url) {
        options.url = uri;
      }
    }
    request(options, callback);
  };
};
