'use strict';

var url = require('url');
var env = require('gitter-web-env');
var nconf = env.config;
var stats = env.stats;
var debug = require('debug')('gitter:app:github:public-token-pool');

var anonymousClientId = nconf.get('github:anonymous_app:client_id');
var anonymousClientSecret = nconf.get('github:anonymous_app:client_secret');

module.exports = function(options, callback, request) {
  var accessToken;
  if (options.headers) {
    accessToken = options.headers.Authorization || options.headers.authorization;
  }

  var parsed;
  if (!accessToken) {
    parsed = url.parse(options.uri || options.url, true);
    accessToken = parsed.query.access_token;
  }

  if (!accessToken) {
    debug('github.anonymous.access');
    stats.eventHF('github.anonymous.access');

    if (!parsed) parsed = url.parse(options.uri || options.url, true);

    /* Only GET requests thanks */
    delete parsed.query.client_id;
    delete parsed.query.client_secret;
    delete parsed.query.access_token;
    delete parsed.search;

    var uri = url.format(parsed);

    if (options.uri) {
      options.uri = uri;
    } else if (options.url) {
      options.url = uri;
    }

    options.headers = options.headers || {};
    options.headers.Authorization = `Basic ${new Buffer(
      `${anonymousClientId}:${anonymousClientSecret}`
    ).toString('base64')}`;
  }
  request(options, callback);
};
