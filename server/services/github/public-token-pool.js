/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var url = require('url');
var nconf = require('../../utils/config');

var count = 0;

module.exports = exports = function(request) {
  return function requestWrapper(options, callback) {

    var uri = options.uri;
    var accessToken;
    if (options.headers) {
      accessToken = options.headers.Authorization || options.headers.authorization;
    }

    if (!accessToken) {
      var p = url.parse(uri, true);
      accessToken = p.query.access_token;
    }

    if(!accessToken) {
      /* Load this jit so that we can add additional values and SIGHUP
       * the process if we need to */
      var accessTokenPool = nconf.get('github:publicAccessTokens');

      accessToken = accessTokenPool[count++ % accessTokenPool.length];
      if (!options.headers) {
        options.headers = {};
      }
      options.headers.Authorization = 'token ' + accessToken;
    }

    request(options, callback);
  };
};
