/*jshint -W083*/
"use strict";

var identityService = require("../../services/identity-service");
var Q = require('q');

function UserProfileStrategy(options) {
  options = options ? options : {};

  this.preload = function(users, callback) {
    // pre-fill the cache
    return identityService.findForUsers(users)
      .then(function() {
        var promises = [];
        for (var i=0; i<users.length; i++) {
          var user = users[i];
          // TODO: if I require this at the top, then it comes back as {}
          var BackendResolver = require('../../services/backend-resolver');
          var backendResolver = new BackendResolver(user);
          // we're only interested in the first profile
          var promise = backendResolver.getProfile()
            .then(function(profile) {
              // cache the profile so we can get it out later.
              user.profile = profile;
            });
          promises.push(promise);
        }
        return Q.all(promises);
      })
      .nodeify(callback);
  }

  this.map = function(user) {
    var profile = user.profile || {};

    /*
    profile will have the following "standard" attributes (if we could find
    values for them) and per-provider fields will be prefixed with 'github_' or
    whatever:
    * company
    * location
    * email
    * website
    * profile
    * provider ('github', 'google', whatever so we can know to include
                different snippets or not, but that could be calculated
                client-side too..)
    */

    profile.id = user.id;
    profile.username = user.username;
    profile.displayName = user.displayName;
    profile.invited = user.state === 'INVITED' || undefined;
    profile.removed = user.state === 'REMOVED' || undefined;

    if (user.gravatarVersion) {
      // github
      profile.gv = user.gravatarVersion;
    } else {
      // non-github
      profile.gravatarImageUrl = user.gravatarImageUrl;
    }

    return profile;
  }
}

UserProfileStrategy.prototype = {
  name: 'UserProfileStrategy'
};

module.exports = UserProfileStrategy;
