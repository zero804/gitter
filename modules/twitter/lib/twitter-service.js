'use strict';

var debug = require('debug')('gitter:modules:twitter-service');
var env = require('gitter-web-env');
var config = env.config;
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

var CONSUMER_KEY = config.get('twitteroauth:consumer_key');
var CONSUMER_SECRET = config.get('twitteroauth:consumer_secret');

function TwitterService(identity) {
  this.identity = identity;
}

TwitterService.prototype.findFollowers = function(username) {
  var followerApiUrl = 'https://api.twitter.com/1.1/followers/list.json';

  return request({
    url: followerApiUrl,
    json: true,
    oauth: {
      consumer_key: CONSUMER_KEY,
      consumer_secret: CONSUMER_SECRET,
      token: this.identity.accessToken,
      token_secret: this.identity.accessTokenSecret
    },
    qs: {
      screen_name: username
    }
  })
  .then(function(results) {
    debug('Twitter API results', results && results.body);
    if (!results.body || !results.body.users) {
      return [];
    }

    return results.body.users;
  });
};

module.exports = TwitterService;
