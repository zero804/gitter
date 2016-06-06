'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

var env = require('gitter-web-env');
var config = env.config;

function convertTwitterUserResultToGitterUsers(twitterUsers) {
  return twitterUsers.map(function(twitterUser) {
    return {
      username: twitterUser.screen_name,
      displayName: twitterUser.name,
      twitterId: twitterUser.id
    };
  });
}


function TwitterBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

TwitterBackend.prototype.getEmailAddress = Promise.method(function(/*preferStoredEmail*/) {
  return this.identity.email;
});

TwitterBackend.prototype.findOrgs = Promise.method(function() {
  return [];
});

TwitterBackend.prototype.getProfile = Promise.method(function() {
  return { provider: 'twitter' };
});

TwitterBackend.prototype.getFollowers = Promise.method(function() {
  var followerApiUrl = 'https://api.twitter.com/1.1/followers/list.json';
  var username = this.user.username.replace(/_twitter$/, '');
  var twitterRequest = request({
    url: followerApiUrl,
    json: true,
    oauth: {
      consumer_key: config.get('twitteroauth:consumer_key'),
      consumer_secret: config.get('twitteroauth:consumer_secret'),
      token: this.identity.accessToken,
      token_secret: this.identity.accessTokenSecret
    },
    qs: {
      screen_name: username
    }
  });

  return twitterRequest.then(function(result) {
    return result.body && result.body.users;
  });
});

TwitterBackend.prototype.getInviteUserSuggestions = function(/*type, linkPath*/) {
  return this.getFollowers()
    // Sort by the number of followers descending
    .then(function(results) {
      return results.sort(function(a, b) {
        if(a.followers_count < b.followers_count) {
          return 1;
        }
        else if(a.followers_count > b.followers_count) {
          return -1;
        }

        return 0;
      })
    })
    .then(convertTwitterUserResultToGitterUsers);
}

module.exports = TwitterBackend;
