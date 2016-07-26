'use strict';

var debug = require('debug')('gitter:modules:collaborators');
var _ = require('lodash');
var TwitterService = require('gitter-web-twitter');
var identityService = require('gitter-web-identity');

function TwitterUserCollaboratorService(user, identity) {
  this.user = user;
  this.identity = identity;
}

TwitterUserCollaboratorService.prototype.findCollaborators = function() {
  var username = this.identity.username;
  var twitterService = new TwitterService(this.identity);

  return twitterService.findFollowers(username)
    .then(function(followers) {
      debug('Twitter followers', followers.length, followers);
      followers.sort(function(a, b) {
        return b.followers_count - a.followers_count;
      });

      followers = followers.slice(0, 20);

      return _.map(followers, function(follower) {
        return {
          displayName: follower.name,
          twitterUsername: follower.screen_name,
          avatarUrl: follower.profile_image_url_https, // TODO: use avatar service?
          type: identityService.TWITTER_IDENTITY_PROVIDER
        };
      });
    });
}

module.exports = TwitterUserCollaboratorService;
