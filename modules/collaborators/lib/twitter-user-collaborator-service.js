'use strict';

var _ = require('lodash');
var TwitterService = require('gitter-web-twitter');
var identityService = require('gitter-web-identity');

function TwitterUserCollaboratorService(user, identity) {
  this.user = user;
  this.identity = identity;
}

TwitterUserCollaboratorService.prototype.findCollaborators = function() {
  var username = this.user.username.replace(/_twitter$/, ''); // This is awful
  var twitterService = new TwitterService(this.identity);

  return twitterService.findFollowers(username)
    .then(function(followers) {
      followers.sort(function(a, b) {
        return b.followers_count - a.followers_count;
      });

      followers = followers.slice(0, 20);

      return _.map(followers, function(follower) {
        return {
          displayName: follower.name,
          twitterUsername: follower.screen_name,
          avatarUrl: follower.profile_image_url_https, // TODO: use avatar service?
          type: identityService.TWITTER_IDENTITY_PROVIDER,
          externalId: follower.id
        };
      });
    });
}

module.exports = TwitterUserCollaboratorService;
