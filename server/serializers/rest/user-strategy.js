/* jshint maxcomplexity:18 */
"use strict";

var troupeService            = require("../../services/troupe-service");
var presenceService          = require("gitter-web-presence");
var Promise                  = require('bluebird');
var winston                  = require('../../utils/winston');
var collections              = require("../../utils/collections");
var GithubContributorService = require('gitter-web-github').GitHubContributorService;
var Promise                  = require('bluebird');
var getVersion               = require('../get-model-version');
var billingService           = require('../../services/billing-service');
var leanUserDao              = require('../../services/daos/user-dao').full;
var resolveUserAvatarUrl     = require('gitter-web-shared/avatars/resolve-user-avatar-url');

function UserPremiumStatusStrategy() {
  var usersWithPlans;

  this.preload = function(userIds) {
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

  this.preload = function() {
    return Promise.try(function() {
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

        if(options.currentUser) {
          userPromise = Promise.resolve(options.currentUser);
        } else if(options.currentUserId) {
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
      });
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

  this.preload = function() {
    return presenceService.findOnlineUsersForTroupe(troupeId)
      .then(function(result) {
        onlineUsers = collections.hashArray(result);
      });
  };

  this.map = function(userId) {
    return !!onlineUsers[userId];
  };
}
UserPresenceInTroupeStrategy.prototype = {
  name: 'UserPresenceInTroupeStrategy'
};

function UserStrategy(options) {
  options = options ? options : {};
  var lean = !!options.lean;
  var userRoleInTroupeStrategy = options.includeRolesForTroupeId || options.includeRolesForTroupe ? new UserRoleInTroupeStrategy(options) : null;
  var userPresenceInTroupeStrategy = options.showPresenceForTroupeId ? new UserPresenceInTroupeStrategy(options.showPresenceForTroupeId) : null;
  var userPremiumStatusStrategy = options.showPremiumStatus ? new UserPremiumStatusStrategy() : null;

  this.preload = function(users) {
    var strategies = [];

    if(userRoleInTroupeStrategy) {
      strategies.push(userRoleInTroupeStrategy.preload());
    }

    if(userPresenceInTroupeStrategy) {
      strategies.push(userPresenceInTroupeStrategy.preload());
    }

    if(userPremiumStatusStrategy) {
      var userIds = users.map(function(user) { return user.id; });
      strategies.push(userPremiumStatusStrategy.preload(userIds));
    }

    return Promise.all(strategies);
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

    var obj;
    if (lean) {
      obj = {
        id: user.id,
        status: options.includeEmail ? user.status : undefined,
        username: user.username,
        online: userPresenceInTroupeStrategy && userPresenceInTroupeStrategy.map(user.id) || undefined,
        role: userRoleInTroupeStrategy && userRoleInTroupeStrategy.map(user.username) || undefined,
        invited: user.state === 'INVITED' || undefined, // true or undefined
        removed: user.state === 'REMOVED' || undefined, // true or undefined
        v: getVersion(user)
      };

      if (user.gravatarVersion) {
        // github
        obj.gv = user.gravatarVersion;
      } else {
        // non-github
        obj.gravatarImageUrl = user.gravatarImageUrl;
      }

      return obj;
    }

    obj = {
      id: user.id,
      status: options.includeEmail ? user.status : undefined,
      username: user.username,
      displayName: options.exposeRawDisplayName ? user.displayName : user.getDisplayName(),
      fallbackDisplayName: options.exposeRawDisplayName && user.getDisplayName(),
      url: user.getHomeUrl(),
      avatarUrlSmall: resolveUserAvatarUrl(user, 60),
      avatarUrlMedium: resolveUserAvatarUrl(user, 128),
      scopes: scopes,
      online: userPresenceInTroupeStrategy && userPresenceInTroupeStrategy.map(user.id) || undefined,
      role: userRoleInTroupeStrategy && userRoleInTroupeStrategy.map(user.username) || undefined,
      premium: userPremiumStatusStrategy && userPremiumStatusStrategy.map(user.id) || undefined,
      /* TODO: when adding states use user.state and the respective string value desired */
      invited: user.state === 'INVITED' || undefined, // true or undefined
      removed: user.state === 'REMOVED' || undefined, // true or undefined
      v: getVersion(user)
    };

    // NOTE: does it make sense to send gv (or the full url) AND small&medium?
    if (user.gravatarVersion) {
      // github
      obj.gv = user.gravatarVersion;
    } else {
      // non-github
      // NOTE: should we just remove this and keep using avatarUrlSmall for now?
      //obj.gravatarImageUrl = user.gravatarImageUrl;
    }

    return obj;
  };
}
UserStrategy.prototype = {
  name: 'UserStrategy'
};


module.exports = UserStrategy;
