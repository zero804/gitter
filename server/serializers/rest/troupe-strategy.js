/* eslint complexity: ["error", 17] */
"use strict";

var logger                = require('gitter-web-env').logger;
var debug                 = require('debug')('gitter:serializer:troupe');
var getVersion            = require('../get-model-version');
var UserIdStrategy        = require('./user-id-strategy');
var MultiPreload          = require('../strategy-tracing').MultiPreload
var mongoUtils            = require('gitter-web-persistence-utils/lib/mongo-utils');

var AllUnreadItemCountStrategy = require('./troupes/all-unread-item-count-strategy');
var FavouriteTroupesForUserStrategy = require('./troupes/favourite-troupes-for-user-strategy');
var LastTroupeAccessTimesForUserStrategy = require('./troupes/last-access-times-for-user-strategy');
var LurkAndActivityForUserStrategy = require('./troupes/lurk-and-activity-for-user-strategy');
var ProOrgStrategy = require('./troupes/pro-org-strategy');
var RoomMembershipStrategy = require('./troupes/room-membership-strategy');
var TagsStrategy = require('./troupes/tags-strategy');
var TroupeOwnerIsOrgStrategy = require('./troupes/troupe-owner-is-org-strategy');
var TroupePermissionsStrategy = require('./troupes/troupe-permissions-strategy');

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
        if (a) return a;
      }
    });
}

function mapIdsSequence(troupes) {
  return troupes.map(function(troupe) {
    return troupe._id;
  });
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
  var ownerIsOrgStrategy;
  var roomMembershipStrategy;

  this.preload = function(items) { // eslint-disable-line max-statements
    if (items.isEmpty()) return;

    var troupeIds = mapIdsSequence(items);

    var strategies = new MultiPreload(this);

    // Pro-org
    proOrgStrategy = new ProOrgStrategy(options);
    strategies.push(proOrgStrategy, items);

    // Room Membership
    if (currentUserId || options.isRoomMember !== undefined) {
      roomMembershipStrategy = new RoomMembershipStrategy(options);
      strategies.push(roomMembershipStrategy, troupeIds);
    }

    // Unread items
    if (currentUserId && !options.skipUnreadCounts) {
      unreadItemStrategy = new AllUnreadItemCountStrategy(options);
      strategies.push(unreadItemStrategy, troupeIds);
    }

    if (currentUserId) {
      // The other user in one-to-one rooms
      var otherUserIds = oneToOneOtherUserSequence(currentUserId, items);
      if (!otherUserIds.isEmpty()) {
        userIdStrategy = new UserIdStrategy(options);
        strategies.push(userIdStrategy, otherUserIds);
      }

      // Favourites for user
      favouriteStrategy = new FavouriteTroupesForUserStrategy(options);
      strategies.push(favouriteStrategy);

      // Last Access Time
      lastAccessTimeStrategy = new LastTroupeAccessTimesForUserStrategy(options);
      strategies.push(lastAccessTimeStrategy);

      // Lurk Activity
      lurkActivityStrategy = new LurkAndActivityForUserStrategy(options);
      strategies.push(lurkActivityStrategy);
    }

    // Permissions
    if ((currentUserId || options.currentUser) && options.includePermissions) {
      permissionsStrategy = new TroupePermissionsStrategy(options);
      strategies.push(permissionsStrategy, items);
    }

    // Include the owner
    if (options.includeOwner) {
      ownerIsOrgStrategy = new TroupeOwnerIsOrgStrategy(options);
      strategies.push(ownerIsOrgStrategy, items);
    }

    // Include the tags
    if (options.includeTags) {
      tagsStrategy = new TagsStrategy(options);
      strategies.push(tagsStrategy, items);
    }

    return strategies.all();
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

  var shownWarning = false;

  this.map = function(item) {
    var troupeName, troupeUrl, otherUser, isPro;

    isPro = proOrgStrategy.map(item);

    if (item.oneToOne) {
      if (currentUserId) {
        otherUser = mapOtherUser(item.oneToOneUsers);
      } else {
        if (shownWarning) {
          otherUser = null;
        } else {
          logger.warn('TroupeStrategy initiated without currentUserId, but generating oneToOne troupes. This can be a problem!');
          shownWarning = true;
        }
      }

      if (otherUser) {
        troupeName = otherUser.displayName;
        troupeUrl = "/" + otherUser.username;
      } else {
        debug("Troupe %s appears to contain bad users", item._id);
        // This should technically never happen......
        return undefined;
      }
    } else {
        troupeName = item.uri;
        troupeUrl = "/" + item.uri;
    }

    var unreadCounts = unreadItemStrategy && unreadItemStrategy.map(item.id);

    // mongoose is upgrading old undefineds to [] on load and we don't want to
    // send through that no providers are allowed in that case
    var providers = (options.includeProviders && item.providers && item.providers.length) ? item.providers : undefined;

    var isLurking;
    var hasActivity;
    if (lurkActivityStrategy) {
      isLurking = lurkActivityStrategy.mapLurkStatus(item.id);
      if (isLurking) {
        // Can only have activity if you're lurking
        hasActivity = lurkActivityStrategy.mapActivity(item.id);
      }
    }

    return {
      id: item.id || item._id,
      name: troupeName,
      topic: item.topic,
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
      githubType: item.githubType,
      security: item.security,
      premium: isPro,
      noindex: item.noindex,
      tags: tagsStrategy ? tagsStrategy.map(item) : undefined,
      providers: providers,
      permissions: permissionsStrategy ? permissionsStrategy.map(item) : undefined,
      ownerIsOrg: ownerIsOrgStrategy ? ownerIsOrgStrategy.map(item) : undefined,
      roomMember: roomMembershipStrategy ? roomMembershipStrategy.map(item.id) : undefined,
      v: getVersion(item)
    };
  };
}

TroupeStrategy.prototype = {
  name: 'TroupeStrategy'
};

module.exports = TroupeStrategy;
