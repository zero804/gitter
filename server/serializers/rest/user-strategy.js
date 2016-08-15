/* eslint complexity: ["error", 19] */
"use strict";

var env = require('gitter-web-env');
var winston = env.logger;
var Promise = require('bluebird');
var identityService = require('gitter-web-identity');
var presenceService = require('gitter-web-presence');
var avatars = require('gitter-web-avatars');
var resolveUserAvatarUrl = require('gitter-web-shared/avatars/resolve-user-avatar-url');
var userScopes = require('gitter-web-identity/lib/user-scopes');
var securityDescriptorUtils = require('gitter-web-permissions/lib/security-descriptor-utils');
var GithubContributorService = require('gitter-web-github').GitHubContributorService;

var collections = require('../../utils/collections');
var getVersion = require('../get-model-version');
var troupeService = require('../../services/troupe-service');
var leanUserDao = require('../../services/daos/user-dao').full;
var adminFilter = require('gitter-web-permissions/lib/known-external-access/admin-filter')


function UserRoleInTroupeStrategy(options) {
  var contributors;

  this.preload = function(userIds) {
    if (userIds.isEmpty()) return;

    return Promise.try(function() {
        if (options.includeRolesForTroupe) return options.includeRolesForTroupe;

        if (options.includeRolesForTroupeId) {
          // TODO: don't do this
          return troupeService.findById(options.includeRolesForTroupeId);
        }
      })
      .then(function(troupe) {
        if (!troupe) return;

        return adminFilter(troupe, userIds);
      })
      .then(function(adminUserIds) {
        if (adminUserIds) {
          contributors = {};

          adminUserIds.forEach(function(userId) {
            contributors[userId] = 'admin';
          });
        }

      })
  };

  this.map = function(userId) {
    return contributors && contributors[userId];
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

function UserProvidersStrategy() {
  var providersByUser = {};

  this.preload = function(users) {
    // NOTE: This is currently operating on the assumption that a user can only
    // have one identity. Once we allow multiple identities per user we'll have
    // to revisit this.
    var nonGitHub = [];
    users.each(function(user) {
      if (userScopes.isGitHubUser(user)) {
        // github user so no need to look up identities at the time of writing
        providersByUser[user.id] = ['github'];
      } else {
        // non-github, so we have to look up the user's identities.
        nonGitHub.push(user);
      }
    });

    if (!nonGitHub.length) {
      return Promise.resolve();
    }

    return Promise.map(nonGitHub, function(user) {
      return identityService.listProvidersForUser(user)
        .then(function(providers) {
          providersByUser[user.id] = providers;
        });
    });
  };

  this.map = function(userId) {
    return providersByUser[userId] || [];
  };
}
UserProvidersStrategy.prototype = {
  name: 'UserProvidersStrategy'
};

function UserStrategy(options) {
  options = options ? options : {};
  var lean = !!options.lean;

  var userRoleInTroupeStrategy;
  var userPresenceInTroupeStrategy;
  var userProvidersStrategy;

  this.preload = function(users) {
    if (users.isEmpty()) return;

    var strategies = [];

    if (options.includeRolesForTroupeId || options.includeRolesForTroupe) {
      userRoleInTroupeStrategy = new UserRoleInTroupeStrategy(options);
      strategies.push(userRoleInTroupeStrategy.preload(users.map(function(user) {
        return user._id;
      })));
    }

    if (options.showPresenceForTroupeId) {
      userPresenceInTroupeStrategy = new UserPresenceInTroupeStrategy(options.showPresenceForTroupeId)
      strategies.push(userPresenceInTroupeStrategy.preload());
    }

    if (options.includeProviders) {
      userProvidersStrategy = new UserProvidersStrategy();
      strategies.push(userProvidersStrategy.preload(users));
    }

    return Promise.all(strategies);
  };

  function displayNameForUser(user) {
    return options.exposeRawDisplayName ? user.displayName : user.displayName || user.username
  }

  this.map = function(user) {
    if (!user) return null;
    var scopes;

    if (options.includeScopes && userScopes.isGitHubUser(user)) {
      scopes = userScopes.getScopesHash(user);
    }

    var obj;

    if (lean) {
      obj = {
        id: user.id,
        status: options.includeEmail ? user.status : undefined,
        username: user.username,
        online: userPresenceInTroupeStrategy && userPresenceInTroupeStrategy.map(user.id) || undefined,
        role: userRoleInTroupeStrategy && userRoleInTroupeStrategy.map(user.id || user._id) || undefined,
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
      displayName: displayNameForUser(user),
      url: '/' + user.username,
      avatarUrl: avatars.getForUser(user),
      avatarUrlSmall: resolveUserAvatarUrl(user, 60),
      avatarUrlMedium: resolveUserAvatarUrl(user, 128),
      scopes: scopes,
      online: userPresenceInTroupeStrategy && userPresenceInTroupeStrategy.map(user.id) || undefined,
      staff: user.staff,
      role: userRoleInTroupeStrategy && userRoleInTroupeStrategy.map(user.id || user._id) || undefined,
      providers: userProvidersStrategy && userProvidersStrategy.map(user.id) || undefined,
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
