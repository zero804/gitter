"use strict";

var identityService = require("../../services/identity-service");
var _ = require('lodash');
var Q = require('q');
var qlimit = require('qlimit');
var limit = qlimit(2); // ?

var STANDARD_ATTRIBUTES = ['company', 'location', 'email', 'website', 'profile'];

function UserProfileStrategy(options) {
  options = options ? options : {};

  // TODO: if I require this at the top, then it comes back as {}
  var BackendResolver = require('../../services/backend-resolver');

  this.preload = function(users, callback) {
    // pre-fill the cache
    return identityService.findByUsers(users)
      .then(function() {
        return Q.all(users.map(limit(function(user) {
          var backendResolver = new BackendResolver(user);
          return backendResolver.findProfiles()
            .then(function(profiles) {
              // cache the profiles so we can get them out later.
              // (is this the best variable name?)
              user.profiles = profiles;
            });
        })));
      })
      .nodeify(callback);
  }

  this.map = function(user) {
    var profile = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      invited: user.state === 'INVITED' || undefined, // isInvited?
      removed: user.state === 'REMOVED' || undefined, // isRemoved?
      has_gitter_login: true // by definition
    };

    // standard stuff goes to the bottom level
    _.extend(profile, _.pick(user.profiles[0], STANDARD_ATTRIBUTES));

    if (user.gravatarVersion) {
      // githubcompan
      profile.gv = user.gravatarVersion;
    } else {
      // non-github
      profile.gravatarImageUrl = user.gravatarImageUrl;
    }

    // all the non-standard stuff along with "provider" goes in identities/
    profile.identities = user.profiles.map(function(p) {
      return _.omit(p, STANDARD_ATTRIBUTES)
    });

    return profile;
  }
}

UserProfileStrategy.prototype = {
  name: 'UserProfileStrategy'
};

module.exports = UserProfileStrategy;
