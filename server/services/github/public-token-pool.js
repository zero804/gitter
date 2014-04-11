/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var url = require('url');
var nconf = require('nconf');


var count = 0;

module.exports = exports = function(request) {
  return function requestWrapper(options, callback) {

    var uri = options.uri;
    var p = url.parse(uri, true);
    var accessToken = p.query.access_token;

    if(!accessToken) {
      /* Load this jit so that we can add additional values and SIGHUP
       * the process if we need to */
      var accessTokenPool = nconf.get('github:publicAccessTokens');

      accessToken = accessTokenPool[count++ % accessTokenPool.length];
      p.query.access_token = accessToken;

      delete p.search;
      uri = url.format(p);
      options.uri = uri;
    }

    request(options, callback);
  };
};
