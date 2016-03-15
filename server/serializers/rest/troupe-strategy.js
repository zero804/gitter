/* jshint maxcomplexity:16 */
"use strict";

var logger                = require('gitter-web-env').logger;
var unreadItemService     = require("../../services/unread-item-service");
var userService           = require("../../services/user-service");
var recentRoomCore        = require('../../services/core/recent-room-core');
var roomMembershipService = require('../../services/room-membership-service');
var billingService        = require('../../services/billing-service');
var roomPermissionsModel  = require('../../services/room-permissions-model');
var troupeService         = require('../../services/troupe-service');
var _                     = require("lodash");
var uniqueIds             = require('mongodb-unique-ids');
var winston               = require('../../utils/winston');
var collections           = require('../../utils/collections');
var debug                 = require('debug')('gitter:troupe-strategy');
var execPreloads          = require('../exec-preloads');
var getVersion            = require('../get-model-version');
var UserIdStrategy        = require('./user-id-strategy');
var Promise               = require('bluebird');

/**
 *
 */
function AllUnreadItemCountStategy(options) {
  var self = this;
  var userId = options.userId || options.currentUserId;

  this.preload = function(troupeIds, callback) {
    unreadItemService.getUserUnreadCountsForTroupeIds(userId, troupeIds)
      .then(function(result) {
        self.unreadCounts = result;
      })
      .nodeify(callback);
  };

  this.map = function(id) {
    return self.unreadCounts[id] ? self.unreadCounts[id] : 0;
  };
}

AllUnreadItemCountStategy.prototype = {
  name: 'AllUnreadItemCountStategy'
};

function RoomMembershipStrategy(options) {
  var userId = options.userId || options.currentUserId;
  var nonMemberTroupeIds = options.nonMemberTroupeIds && collections.hashArray(options.nonMemberTroupeIds);
  var predefinedValue = options.isRoomMember !== undefined;
  var memberships;

  this.preload = function(troupeIds, callback) {
    // Shortcut logic
    if (nonMemberTroupeIds || predefinedValue) {
      return callback();
    }

    return roomMembershipService.findUserMembershipInRooms(userId, troupeIds)
      .then(function(memberTroupeIds) {
        memberships = collections.hashArray(memberTroupeIds);
      })
      .nodeify(callback);
  };

  this.map = function(id) {
    if (predefinedValue) {
      return options.isRoomMember;
    }

    if (nonMemberTroupeIds) {
      return !nonMemberTroupeIds[id]; // Negate
    }

    return !!memberships[id];
  };
}

RoomMembershipStrategy.prototype = {
  name: 'AllUnreadItemCountStategy'
};


function LastTroupeAccessTimesForUserStrategy(options) {
  var userId = options.userId || options.currentUserId;
  var timesIndexed;

  this.preload = function(data, callback) {
    return recentRoomCore.getTroupeLastAccessTimesForUserExcludingHidden(userId)
      .then(function(times) {
        timesIndexed = times;
      })
      .nodeify(callback);
  };

  this.map = function(id) {
    // No idea why, but sometimes these dates are converted to JSON as {}, hence the weirdness below
    return timesIndexed[id] ? new Date(timesIndexed[id].valueOf()).toISOString() : undefined;
  };
}
LastTroupeAccessTimesForUserStrategy.prototype = {
  name: 'LastTroupeAccessTimesForUserStrategy'
};

function FavouriteTroupesForUserStrategy(options) {
  var self = this;
  var userId = options.userId || options.currentUserId;

  this.preload = function(data, callback) {
    recentRoomCore.findFavouriteTroupesForUser(userId)
      .then(function(favs) {
        self.favs = favs;
      })
      .nodeify(callback);
  };

  this.map = function(id) {
    var favs = self.favs[id];
    if(!favs) return undefined;
    if(favs === '1') return 1000;
    return favs;
  };
}
FavouriteTroupesForUserStrategy.prototype = {
  name: 'FavouriteTroupesForUserStrategy'
};

function LurkTroupeForUserStrategy(options) {
  var currentUserId = options.currentUserId;
  var roomsWithLurk;

  this.preload = function(data, callback) {
    roomMembershipService.findRoomIdsForUserWithLurk(currentUserId)
      .then(function(result) {
        roomsWithLurk = result;
      })
      .nodeify(callback);
  };

  this.map = function(roomId) {
    return roomsWithLurk[roomId];
  };
}
LurkTroupeForUserStrategy.prototype = {
  name: 'LurkTroupeForUserStrategy'
};

function ActivityForUserStrategy(options) {
  var currentUserId = options.currentUserId;
  var activity = {};

  this.preload = function(troupeIds, callback) {
    unreadItemService.getActivityIndicatorForTroupeIds(troupeIds, currentUserId)
    .then(function(values) {
      activity = values;
      return activity;
    })
    .nodeify(callback);
  };

  this.map = function(roomId) {
    return activity[roomId];
  };
}
ActivityForUserStrategy.prototype = {
  name: 'ActivityForUserStrategy'
};



function TagsStrategy(options) {
  var self = this;
  self.tagMap = {};

  this.preload = function(rooms, callback) {
    rooms.forEach(function(room) {
      self.tagMap[room.id] = room.tags;
    });
    callback();
  };

  this.map = function(roomId) {
    if(options.includeTags) {
      return self.tagMap[roomId] || [];
    }
  };
}
TagsStrategy.prototype = {
  name: 'TagsStrategy'
};




function ProOrgStrategy() {
  var proOrgs = {};

  var getOwner = function (uri) {
    return uri.split('/', 1).shift();
  };

  this.preload = function (troupes, callback) {

    var uris = troupes.map(function(troupe) {
      if(!troupe.uri) return; // one-to-one
      return getOwner(troupe.uri);
    }).filter(function(room) {
      return !!room; // this removes the `undefined` left behind (one-to-ones)
    });

    // uniqueIds should work here as they're strings although it's not strictly correct
    return billingService.findActiveOrgPlans(uniqueIds(uris))
      .then(function(subscriptions) {
        subscriptions.forEach(function(subscription) {
          proOrgs[subscription.uri.toLowerCase()] = !!subscription;
        });

        return true;
      })
      .nodeify(callback);
  };

  this.map = function(troupe) {
    if (!troupe || !troupe.uri) return undefined;
    var owner = getOwner(troupe.uri).toLowerCase();
    return proOrgs[owner];
  };
}
ProOrgStrategy.prototype = {
  name: 'ProOrgStrategy'
};

/** Returns the permissions the user has in the orgs. This is not intended to be used for large sets, rather individual items */
function TroupePermissionsStrategy(options) {
  var isAdmin = {};

  function getUser() {
    if (options.currentUser) return Promise.resolve(options.currentUser);
    return userService.findById(options.currentUserId);
  }

  this.preload = function (troupes, callback) {
    return getUser()
      .then(function(user) {
        if (!user) return;

        return Promise.map(troupes, function(troupe) {
          return roomPermissionsModel(user, 'admin', troupe)
            .then(function(admin) {
              isAdmin[troupe.id] = admin;
            })
            .catch(function(err) {
              // Fallback in case of GitHub API downtime
              logger.error('Unable to obtain admin permissions', { exception: err });
              isAdmin[troupe.id] = false;
            });
        });
      })
      .nodeify(callback);
  };

  this.map = function(troupe) {
    return {
      admin: isAdmin[troupe.id] || false
    };
  };
}

TroupePermissionsStrategy.prototype = {
  name: 'TroupePermissionsStrategy'
};

var TroupeOwnerIsOrgStrategy = function (){

  var ownerIsOrg = {};

  this.preload = function(troupes, callback) {
    // Use uniq as the list of items will probably be much smaller than the original set,
    // this means way fewer queries to mongodb
    var ownersForQuery = _.uniq(troupes.map(function(troupe){
      return troupe.lcOwner;
    }).filter(function(t){
      return !!t;
    }));

    return Promise.map(ownersForQuery, function(lcOwner){
      return troupeService.checkGitHubTypeForUri(lcOwner || '', 'ORG');
    })
    .then(function(results) {
      var hashed = ownersForQuery.reduce(function(memo, lcOwnerId, index){
        memo[lcOwnerId] = results[index];
        return memo;
      }, {});

      results.forEach(function(result, index){
        //not being able to pass the troupe means we ASSUME they come through in order correctly
        var troupe = troupes[index];
        ownerIsOrg[troupe.id] = troupe.lcOwner && hashed[troupe.lcOwner];
      });
    })
    .nodeify(callback);
  };

  this.map = function (troupe){
    return (ownerIsOrg[troupe.id] || false);
  };
};

TroupeOwnerIsOrgStrategy.prototype = {
  name: 'TroupeOwnerIsOrgStrategy'
};

function TroupeStrategy(options) {
  if(!options) options = {};

  var currentUserId = options.currentUserId;

  var unreadItemStategy     = currentUserId && !options.skipUnreadCounts ? new AllUnreadItemCountStategy(options) : null;
  var lastAccessTimeStategy = currentUserId ? new LastTroupeAccessTimesForUserStrategy(options) : null;
  var favouriteStrategy     = currentUserId ? new FavouriteTroupesForUserStrategy(options) : null;
  var lurkStrategy          = currentUserId ? new LurkTroupeForUserStrategy(options) : null;
  var activityStrategy      = currentUserId ? new ActivityForUserStrategy(options) : null;
  var tagsStrategy          = currentUserId ? new TagsStrategy(options) : null;

  var userIdStategy         = new UserIdStrategy(options);
  var proOrgStrategy        = new ProOrgStrategy(options);
  var permissionsStategy    = (currentUserId || options.currentUser) && options.includePermissions ? new TroupePermissionsStrategy(options) : null;
  var ownerIsOrgStrategy    = (options.includeOwner) ? new TroupeOwnerIsOrgStrategy(options) : null;
  var roomMembershipStrategy = currentUserId || options.isRoomMember !== undefined ? new RoomMembershipStrategy(options) : null;

  this.preload = function(items, callback) {
    var strategies = [];
    var troupeIds = [];
    var userIdSet = {};

    _.each(items, function(troupe) {
      troupeIds.push(troupe.id);

      // Add one-to-one users to the mix
      if(troupe.oneToOne) {
        _.each(troupe.oneToOneUsers, function(troupeUser) {
          userIdSet[troupeUser.userId] = true;
        });
      }
    });
    var userIds = Object.keys(userIdSet);

    if (roomMembershipStrategy) {
      strategies.push({
        strategy: roomMembershipStrategy,
        data: troupeIds
      });
    }

    if(unreadItemStategy) {
      strategies.push({
        strategy: unreadItemStategy,
        data: troupeIds
      });
    }

    if(favouriteStrategy) {
      strategies.push({
        strategy: favouriteStrategy,
        data: null
      });
    }

    if(lastAccessTimeStategy) {
      strategies.push({
        strategy: lastAccessTimeStategy,
        data: null
      });
    }

    strategies.push({
      strategy: proOrgStrategy,
      data: items
    });

    if (lurkStrategy) {
      strategies.push({
        strategy: lurkStrategy,
        data: null
      });
    }

    if (permissionsStategy) {
      strategies.push({
        strategy: permissionsStategy,
        data: items
      });
    }

    strategies.push({
      strategy: userIdStategy,
      data: userIds
    });

    if(ownerIsOrgStrategy) {
      strategies.push({
        strategy: ownerIsOrgStrategy,
        data: items
      });
    }

    if(activityStrategy) {
      strategies.push({
        strategy: activityStrategy,
        data: troupeIds
      });
    }

    if(tagsStrategy) {
      strategies.push({
        strategy: tagsStrategy,
        data: items
      });
    }

    execPreloads(strategies, callback);
  };

  function mapOtherUser(users) {

    var otherUser = users.filter(function(troupeUser) {
      return '' + troupeUser.userId !== '' + currentUserId;
    })[0];

    if(otherUser) {
      var user = userIdStategy.map(otherUser.userId);
      if(user) {
        return user;
      }
    }
  }

  var shownWarning = false;

  this.map = function(item) {
    var troupeName, troupeUrl, otherUser, isPro;

    isPro = proOrgStrategy.map(item);

    if(item.oneToOne) {
      if(currentUserId) {
        otherUser =  mapOtherUser(item.oneToOneUsers);
      } else {
        if(!shownWarning) {
          winston.warn('TroupeStrategy initiated without currentUserId, but generating oneToOne troupes. This can be a problem!');
          shownWarning = true;
        } else {
          otherUser = null;
        }
      }

      if(otherUser) {
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

    var unreadCounts = unreadItemStategy && unreadItemStategy.map(item.id);

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
      lastAccessTime: lastAccessTimeStategy ? lastAccessTimeStategy.map(item.id) : undefined,
      favourite: favouriteStrategy ? favouriteStrategy.map(item.id) : undefined,
      lurk: lurkStrategy ? !item.oneToOne && lurkStrategy.map(item.id) : undefined,
      activity: activityStrategy ? activityStrategy.map(item.id) : undefined,
      url: troupeUrl,
      githubType: item.githubType,
      security: item.security,
      premium: isPro,
      noindex: item.noindex,
      tags: tagsStrategy ? tagsStrategy.map(item.id) : undefined,
      permissions: permissionsStategy ? permissionsStategy.map(item) : undefined,
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
