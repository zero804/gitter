"use strict";

var identityService = require("../../services/identity-service");
var _               = require('lodash');
var Promise         = require('bluebird');
var BackendMuxer    = require('../../services/backend-muxer');

function UserProfileStrategy(options) {
  options = options ? options : {};

  this.preload = function(users) {
    // pre-fill the cache
    return identityService.preloadForUsers(users)
      .then(function() {
        return Promise.map(users, function(user) {
          var backendMuxer = new BackendMuxer(user);
          return backendMuxer.findProfiles()
            .then(function(profiles) {
              // cache the profiles so we can get them out later.
              // (is this the best variable name?)

              // A hash would probably we better for this
              user.profiles = profiles;
            });
        }, { concurrency: 2 });
      });
  };

  this.map = function(user) {
    var profile = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      invited: user.state === 'INVITED' || undefined, // isInvited?
      removed: user.state === 'REMOVED' || undefined, // isRemoved?
      has_gitter_login: true // by definition
    };

    // Provider is just the one that matched and we prefer the avatar in the
    // database over what's coming from the API so that it is easier to reuse
    // gravatarVersion for github users.
    _.extend(profile, _.omit(user.profiles[0], ['provider', 'gravatarImageUrl']));

    if (user.gravatarVersion) {
      // github
      profile.gv = user.gravatarVersion;
    } else {
      // non-github
      profile.gravatarImageUrl = user.gravatarImageUrl;
    }

    return profile;
  };
}

UserProfileStrategy.prototype = {
  name: 'UserProfileStrategy'
};

module.exports = UserProfileStrategy;
