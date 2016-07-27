/* eslint complexity: ["error", 16] */
"use strict";

var Promise = require('bluebird');
var debug = require('debug')('gitter:infra:serializer:troupe');
var getVersion = require('../get-model-version');
var UserIdStrategy = require('./user-id-strategy');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var avatars = require('gitter-web-avatars');

var AllUnreadItemCountStrategy = require('./troupes/all-unread-item-count-strategy');
var FavouriteTroupesForUserStrategy = require('./troupes/favourite-troupes-for-user-strategy');
var LastTroupeAccessTimesForUserStrategy = require('./troupes/last-access-times-for-user-strategy');
var LurkAndActivityForUserStrategy = require('./troupes/lurk-and-activity-for-user-strategy');
var ProOrgStrategy = require('./troupes/pro-org-strategy');
var RoomMembershipStrategy = require('./troupes/room-membership-strategy');
var TagsStrategy = require('./troupes/tags-strategy');
var TroupePermissionsStrategy = require('./troupes/troupe-permissions-strategy');
var GroupIdStrategy = require('./group-id-strategy');
var TroupeBackendStrategy = require('./troupes/troupe-backend-strategy');


function getAvatarUrlForTroupe(serializedTroupe, group) {
  if (serializedTroupe.oneToOne && serializedTroupe.user) {
    return avatars.getForUser(serializedTroupe.user);
  }
  else if(serializedTroupe.oneToOne && !serializedTroupe.user) {
    //TODO this is totally and utterly broken. 1-2-1's don't have a name here
    //nor do they have nay serialized users so avatar resolution here is never going to work
    //I imagine its for reasons like this we moved avatar generation to the client apps ....
    return avatars.getForRoomUri(serializedTroupe.name);
  }
  else if (group && group.hasAvatarSet) {
    return avatars.getForGroup(group);
  }
  else if(serializedTroupe.groupId) {
    return avatars.getForGroupId(serializedTroupe.groupId);
  }
  else {
    return avatars.getForRoomUri(serializedTroupe.uri);
  }
}

/**
 * Given the currentUser and a sequence of troupes
 * returns the 'other' userId for all one to one rooms
 */
function oneToOneOtherUserSequence(currentUserId, troupes) {
  return troupes.filter(function(troupe) {
      return troupe.oneToOne;
    })
    .map(function(troupe) {
      var a = troupe.oneToOneUsers[0] && troupe.oneToOneUsers[0].userId;
      var b = troupe.oneToOneUsers[1] && troupe.oneToOneUsers[1].userId;

      if (mongoUtils.objectIDsEqual(currentUserId, a)) {
        return b;
      } else {
        return a;
      }
    });
}

/** Best guess efforts */
function guessLegacyGitHubType(item) {
  if (item.githubType) {
    return item.githubType;
  }

  if (item.oneToOne) {
    return 'ONETOONE';
  }

  if (!item.sd) return 'REPO_CHANNEL'; // Could we do better?

  var linkPath = item.sd.linkPath;

  switch(item.sd.type) {
    case 'GH_REPO':
      if (item.uri === linkPath) {
        return 'REPO';
      } else {
        return 'REPO_CHANNEL';
      }
      /* break */

    case 'GH_ORG':
      if (item.uri === linkPath) {
        return 'REPO';
      } else {
        return 'REPO_CHANNEL';
      }
      /* break */

    case 'GH_USER':
      return 'USER_CHANNEL';
  }

  return 'REPO_CHANNEL';
}

/** Best guess efforts */
function guessLegacySecurity(item) {
  if (item.security) {
    return item.security;
  }

  // One-to-one rooms in legacy had security=null
  if (item.oneToOne) {
    return undefined;
  }

  if (item.sd.public) {
    return 'PUBLIC';
  }

  var type = item.sd.type;
  if (type === 'GH_REPO' || type === 'GH_ORG') {
    if (item.sd.linkPath && item.sd.linkPath !== item.uri) {
      return 'INHERITED';
    }
  }

  return 'PRIVATE';
}

function TroupeStrategy(options) {
  if (!options) options = {};

  var currentUserId = mongoUtils.asObjectID(options.currentUserId);

  var unreadItemStrategy;
  var lastAccessTimeStrategy;
  var favouriteStrategy;
  var lurkActivityStrategy;
  var tagsStrategy;
  var userIdStrategy;
  var proOrgStrategy;
  var permissionsStrategy;
  var roomMembershipStrategy;
  var groupIdStrategy;
  var backendStrategy;

  this.preload = function(items) { // eslint-disable-line max-statements
    if (items.isEmpty()) return;

    var troupeIds = items.map(function(troupe) {
      return troupe._id;
    });

    var strategies = [];

    // Pro-org
    proOrgStrategy = new ProOrgStrategy(options);
    strategies.push(proOrgStrategy.preload(items));

    // Room Membership
    if (currentUserId || options.isRoomMember !== undefined) {
      roomMembershipStrategy = new RoomMembershipStrategy(options);
      strategies.push(roomMembershipStrategy.preload(troupeIds));
    }

    // Unread items
    if (currentUserId && !options.skipUnreadCounts) {
      unreadItemStrategy = new AllUnreadItemCountStrategy(options);
      strategies.push(unreadItemStrategy.preload(troupeIds));
    }

    if (currentUserId) {
      // The other user in one-to-one rooms
      var otherUserIds = oneToOneOtherUserSequence(currentUserId, items);
      if (!otherUserIds.isEmpty()) {
        userIdStrategy = new UserIdStrategy(options);
        strategies.push(userIdStrategy.preload(otherUserIds));
      }

      // Favourites for user
      favouriteStrategy = new FavouriteTroupesForUserStrategy(options);
      strategies.push(favouriteStrategy.preload());

      // Last Access Time
      lastAccessTimeStrategy = new LastTroupeAccessTimesForUserStrategy(options);
      strategies.push(lastAccessTimeStrategy.preload());

      // Lurk Activity
      lurkActivityStrategy = new LurkAndActivityForUserStrategy(options);
      strategies.push(lurkActivityStrategy.preload());
    }

    // Permissions
    if ((currentUserId || options.currentUser) && options.includePermissions) {
      permissionsStrategy = new TroupePermissionsStrategy(options);
      strategies.push(permissionsStrategy.preload(items));
    }

    // Include the tags
    if (options.includeTags) {
      tagsStrategy = new TagsStrategy(options);
      strategies.push(tagsStrategy.preload(items));
    }

    if (options.includeGroups) {
      groupIdStrategy = new GroupIdStrategy(options);
      var groupIds = items.map(function(troupe) {
          return troupe.groupId;
        })
        .filter(function(f) {
          return !!f;
        });

      strategies.push(groupIdStrategy.preload(groupIds));
    }


    if (options.includeBackend) {
      backendStrategy = new TroupeBackendStrategy();
      // Backend strategy needs no mapping stage
    }

    return Promise.all(strategies)
  };

  function mapOtherUser(users) {
    var otherUser = users.filter(function(troupeUser) {
      return '' + troupeUser.userId !== '' + currentUserId;
    })[0];

    if (otherUser) {
      var user = userIdStrategy.map(otherUser.userId);
      if (user) {
        return user;
      }
    }
  }

  function resolveOneToOneOtherUser(item) {
    if (!currentUserId) {
      debug('TroupeStrategy initiated without currentUserId, but generating oneToOne troupes. This can be a problem!');
      return null;
    }

    var otherUser = mapOtherUser(item.oneToOneUsers);

    if (!otherUser) {
      debug("Troupe %s appears to contain bad users", item._id);
      return null;
    }

    return otherUser;
  }

  function resolveProviders(item) {
    // mongoose is upgrading old undefineds to [] on load and we don't want to
    // send through that no providers are allowed in that case

    if (options.includeProviders && item.providers && item.providers.length) {
      return item.providers;
    } else {
      return undefined;
    }
  }

  this.map = function(item) {
    var isPro = proOrgStrategy.map(item);

    var troupeName, troupeUrl;
    if (item.oneToOne) {
      var otherUser = resolveOneToOneOtherUser(item);
      if (otherUser) {
        troupeName = otherUser.displayName;
        troupeUrl = "/" + otherUser.username;
      } else {
        return null;
      }
    } else {
      troupeName = item.uri;
      troupeUrl = "/" + item.uri;
    }

    var unreadCounts = unreadItemStrategy && unreadItemStrategy.map(item.id);
    var providers = resolveProviders(item);

    var isLurking;
    var hasActivity;
    if (lurkActivityStrategy) {
      isLurking = lurkActivityStrategy.mapLurkStatus(item.id);
      if (isLurking) {
        // Can only have activity if you're lurking
        hasActivity = lurkActivityStrategy.mapActivity(item.id);
      }
    }

    var isPublic;
    if (item.oneToOne) {
      // Double-check here
      isPublic = false;
    } else {
      isPublic = item.sd.public;
    }

    var group = groupIdStrategy && item.groupId ? groupIdStrategy.map(item.groupId) : undefined;

    return {
      id: item.id || item._id,
      name: troupeName,
      topic: item.topic,
      avatarUrl: getAvatarUrlForTroupe(item, group),
      uri: item.uri,
      oneToOne: item.oneToOne,
      userCount: item.userCount,
      user: otherUser,
      unreadItems: unreadCounts ? unreadCounts.unreadItems : undefined,
      mentions: unreadCounts ? unreadCounts.mentions : undefined,
      lastAccessTime: lastAccessTimeStrategy ? lastAccessTimeStrategy.map(item.id) : undefined,
      favourite: favouriteStrategy ? favouriteStrategy.map(item.id) : undefined,
      lurk: isLurking,
      activity: hasActivity,
      url: troupeUrl,
      githubType: guessLegacyGitHubType(item),
      security: guessLegacySecurity(item),
      premium: isPro,
      noindex: item.noindex,
      tags: tagsStrategy ? tagsStrategy.map(item) : undefined,
      providers: providers,
      permissions: permissionsStrategy ? permissionsStrategy.map(item) : undefined,
      roomMember: roomMembershipStrategy ? roomMembershipStrategy.map(item.id) : undefined,
      groupId: item.groupId,
      group: group,
      backend: backendStrategy ? backendStrategy.map(item) : undefined,
      public: isPublic,
      v: getVersion(item)
    };
  };
}

TroupeStrategy.prototype = {
  name: 'TroupeStrategy'
};

module.exports = TroupeStrategy;
module.exports.testOnly = {
  oneToOneOtherUserSequence: oneToOneOtherUserSequence
}
