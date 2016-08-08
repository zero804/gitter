'use strict';

var debug = require('debug')('gitter:modules:twitter');
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));


var FOLLOWER_API_ENDPOINT = 'https://api.twitter.com/1.1/followers/list.json';
var TWEET_API_ENDPOINT = 'https://api.twitter.com/1.1/statuses/update.json';

function TwitterService(consumerKey, consumerSecret, accessToken, accessTokenSecret) {
  this.consumerKey = consumerKey;
  this.consumerSecret = consumerSecret;
  this.accessToken = accessToken;
  this.accessTokenSecret = accessTokenSecret;
}

TwitterService.prototype.findFollowers = function(username) {

  return request({
    url: FOLLOWER_API_ENDPOINT,
    json: true,
    oauth: {
      consumer_key: this.consumerKey,
      consumer_secret: this.consumerSecret,
      token: this.accessToken,
      token_secret: this.accessTokenSecret
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


TwitterService.prototype.sendTweet = function(status) {
  return request({
    method: 'POST',
    url: TWEET_API_ENDPOINT,
    json: true,
    oauth: {
      consumer_key: this.consumerKey,
      consumer_secret: this.consumerSecret,
      token: this.accessToken,
      token_secret: this.accessTokenSecret
    },
    form: {
      status: status
    }
  })
  .tap(function() {
    debug('Sent tweet', status);
  });
};

module.exports = TwitterService;
