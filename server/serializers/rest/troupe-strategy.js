/* eslint complexity: ["error", 20] */
"use strict";

var Promise = require('bluebird');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

var UserIdStrategy = require('./user-id-strategy');
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
var getVersion = require('../get-model-version');
var resolveOneToOneOtherUser = require('../resolve-one-to-one-other-user');
var getRoomNameAndUrl = require('../get-room-name-and-url');
var getAvatarUrlForRoom = require('../get-avatar-url-for-room');
var oneToOneOtherUserSequence = require('../one-to-tne-other-user-sequence');

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

    groupIdStrategy = new GroupIdStrategy(options);
    var groupIds = items.map(function(troupe) {
        return troupe.groupId;
      })
      .filter(function(f) {
        return !!f;
      });

    strategies.push(groupIdStrategy.preload(groupIds));


    if (options.includeBackend) {
      backendStrategy = new TroupeBackendStrategy();
      // Backend strategy needs no mapping stage
    }

    return Promise.all(strategies)
  };

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

    var group = groupIdStrategy && item.groupId ? groupIdStrategy.map(item.groupId) : undefined;

    var otherUser;
    var slimOtherUser = resolveOneToOneOtherUser(item, currentUserId);
    if(slimOtherUser) {
      otherUser = userIdStrategy.map(slimOtherUser.userId);
    }

    var nameInfo = getRoomNameAndUrl(group, item, {
      otherUser: otherUser
    });
    var troupeName = nameInfo.name;
    var troupeUrl = nameInfo.url;

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

    var avatarUrl = getAvatarUrlForRoom(item, {
      name: troupeName,
      group: group,
      user: otherUser
    });

    return {
      id: item.id || item._id,
      name: troupeName,
      topic: item.topic,
      avatarUrl: avatarUrl,
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
      group: options.includeGroups ? group : undefined,
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
