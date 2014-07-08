/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService       = require("../../services/user-service");
var troupeService     = require("../../services/troupe-service");
var presenceService   = require("../../services/presence-service");
var Q                 = require("q");
var winston           = require('../../utils/winston');
var collections       = require("../../utils/collections");
var GitHubRepoService = require('../../services/github/github-repo-service');
var execPreloads      = require('../exec-preloads');
var getVersion        = require('../get-model-version');

function UserRoleInTroupeStrategy(options) {
  var contributors;
  var ownerLogin;

  this.preload = function(unused, callback) {
    return Q.fcall(function() {
        if(options.includeRolesForTroupe) return options.includeRolesForTroupe;

        if(options.includeRolesForTroupeId) {
          return troupeService.findById(options.includeRolesForTroupeId);
        }
      })
      .then(function(troupe) {
        if(!troupe) return;
        /* Only works for repos */
        if(troupe.githubType !== 'REPO') return;
        var userPromise;

        if(options.currentUser) userPromise = Q.resolve(options.currentUser);
        if(options.currentUserId) {
          userPromise = userService.findById(options.currentUserId);
        }

        if(userPromise) {
          return userPromise.then(function(user) {
            /* Need a user to perform the magic */
            if(!user) return;
            var uri = troupe.uri;
            ownerLogin = uri.split('/')[0];

            var repoService = new GitHubRepoService(user);
            return repoService.getContributors(uri);
          });
        }
      })
      .fail(function(err) {
        /* Github Repo failure. Die quietely */
        winston.error('UserRoleInTroupeStrategy unable to get contributors' + err, { exception: err });
        return;
      })
      .then(function(githubContributors) {
        if(!githubContributors) return;
        contributors = {};
        githubContributors.forEach(function(user) {
          contributors[user.login] = 'contributor';
        });

        // Temporary stop-gap solution until we can figure out
        // who the admins are
        contributors[ownerLogin] = 'admin';
      })
      .nodeify(callback);
  };

  this.map = function(username) {
    return contributors && contributors[username];
  };
}

function UserPresenceInTroupeStrategy(troupeId) {
  var onlineUsers;

  this.preload = function(unused, callback) {
    presenceService.findOnlineUsersForTroupe(troupeId, function(err, result) {
      if(err) return callback(err);
      onlineUsers = collections.hashArray(result);
      callback(null, true);
    });
  };

  this.map = function(userId) {
    return !!onlineUsers[userId];
  };

}

function setAvatarSize(url, size) {
  var sizeText;
  if(!url || typeof url !== "string") return null;
  if(size=='m') sizeText="s=128";
  if(size=='s') sizeText="s=60";

  if(url.indexOf('?') >= 0) {
    return url + '&' + sizeText;
  }

  return url + '?' + sizeText;
}

function UserStrategy(options) {
  options = options ? options : {};
  var userRoleInTroupeStrategy = options.includeRolesForTroupeId || options.includeRolesForTroupe ? new UserRoleInTroupeStrategy(options) : null;
  var userPresenceInTroupeStrategy = options.showPresenceForTroupeId ? new UserPresenceInTroupeStrategy(options.showPresenceForTroupeId) : null;

  this.preload = function(users, callback) {
    var strategies = [];

    if(userRoleInTroupeStrategy) {
      strategies.push({
        strategy: userRoleInTroupeStrategy,
        data: null
      });
    }

    if(userPresenceInTroupeStrategy) {
      strategies.push({
        strategy: userPresenceInTroupeStrategy,
        data: null
      });
    }

    execPreloads(strategies, callback);
  };

  this.map = function(user) {
    if(!user) return null;
    var scopes;

    if(options.includeScopes) {
      scopes = {
        'public_repo': user.hasGitHubScope('public_repo'),
        'private_repo': user.hasGitHubScope('repo')
      };
    }
    return {
      id: user.id,
      status: options.includeEmail ? user.status : undefined,
      username: user.username,
      displayName: options.exposeRawDisplayName ? user.displayName : user.getDisplayName(),
      fallbackDisplayName: options.exposeRawDisplayName && user.getDisplayName(),
      url: user.getHomeUrl(),
      avatarUrlSmall: setAvatarSize(user.gravatarImageUrl,'s'),
      avatarUrlMedium: setAvatarSize(user.gravatarImageUrl,'m'),
      scopes: scopes,
      online: userPresenceInTroupeStrategy && userPresenceInTroupeStrategy.map(user.id) || undefined,
      role: userRoleInTroupeStrategy && userRoleInTroupeStrategy.map(user.username) || undefined,
      v: getVersion(user)
    };
  };
}


module.exports = UserStrategy;