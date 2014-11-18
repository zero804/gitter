"use strict";

var troupeService     = require("../../services/troupe-service");
var presenceService   = require("../../services/presence-service");
var Q                 = require("q");
var winston           = require('../../utils/winston');
var collections       = require("../../utils/collections");
var GithubContributorService = require('../../services/github/github-contributor-service');
var execPreloads      = require('../exec-preloads');
var getVersion        = require('../get-model-version');
var billingService    = require('../../services/billing-service');
var leanUserDao       = require('../../services/daos/user-dao').full;

function UserPremiumStatusStrategy() {
  var usersWithPlans;

  this.preload = function(userIds, callback) {
    return billingService.findActivePersonalPlansForUsers(userIds)
      .then(function(subscriptions) {
        usersWithPlans = subscriptions.reduce(function(memo, s) {
          memo[s.userId] = true;
          return memo;
        }, {});

        return true;
      })
      .nodeify(callback);
  };

  this.map = function(userId) {
    return usersWithPlans[userId];
  };
}
UserPremiumStatusStrategy.prototype = {
  name: 'UserPremiumStatusStrategy'
};

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
          userPromise = leanUserDao.findById(options.currentUserId);
        }

        if(userPromise) {
          return userPromise.then(function(user) {
            /* Need a user to perform the magic */
            if(!user) return;
            var uri = troupe.uri;
            ownerLogin = uri.split('/')[0];

            var contributorService = new GithubContributorService(user);
            return contributorService.getContributors(uri)
              .timeout(1000)
              .catch(function(err) {
                /* Github Repo failure. Die quietely */
                winston.info('Contributor fetch failed: ' + err);
                return [];
              });
          });
        }
      })
      .then(function(githubContributors) {
        contributors = {};

        if(githubContributors) {
          githubContributors.forEach(function(contributor) {
            contributors[contributor.login] = 'contributor';
          });
        }

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
UserRoleInTroupeStrategy.prototype = {
  name: 'UserRoleInTroupeStrategy'
};

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
UserPresenceInTroupeStrategy.prototype = {
  name: 'UserPresenceInTroupeStrategy'
};

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
  var lean = !!options.lean;
  var userRoleInTroupeStrategy = options.includeRolesForTroupeId || options.includeRolesForTroupe ? new UserRoleInTroupeStrategy(options) : null;
  var userPresenceInTroupeStrategy = options.showPresenceForTroupeId ? new UserPresenceInTroupeStrategy(options.showPresenceForTroupeId) : null;
  var userPremiumStatusStrategy = options.showPremiumStatus ? new UserPremiumStatusStrategy() : null;

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

    if(userPremiumStatusStrategy) {
      strategies.push({
        strategy: userPremiumStatusStrategy,
        data: users.map(function(user) { return user.id; })
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

    if (lean) {
      return {
        id: user.id,
        status: options.includeEmail ? user.status : undefined,
        username: user.username,
        online: userPresenceInTroupeStrategy && userPresenceInTroupeStrategy.map(user.id) || undefined,
        role: userRoleInTroupeStrategy && userRoleInTroupeStrategy.map(user.username) || undefined,
        invited: user.state === 'INVITED' || undefined, // true or undefined
        removed: user.state === 'REMOVED' || undefined, // true or undefined
        v: getVersion(user)
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
      premium: userPremiumStatusStrategy && userPremiumStatusStrategy.map(user.id) || undefined,
      /* TODO: when adding states use user.state and the respective string value desired */
      invited: user.state === 'INVITED' || undefined, // true or undefined
      removed: user.state === 'REMOVED' || undefined, // true or undefined
      v: getVersion(user)
    };
  };
}
UserStrategy.prototype = {
  name: 'UserStrategy'
};


module.exports = UserStrategy;
