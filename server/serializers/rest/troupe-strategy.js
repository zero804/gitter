/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var unreadItemService = require("../../services/unread-item-service");
var recentRoomService = require('../../services/recent-room-service');
var roomMembershipService = require('../../services/room-membership-service');
var billingService    = require('../../services/billing-service');

var _                 = require("underscore");
var winston           = require('../../utils/winston');
var debug             = require('debug')('gitter:troupe-strategy');
var execPreloads      = require('../exec-preloads');
var getVersion        = require('../get-model-version');
var UserIdStrategy    = require('./user-id-strategy');

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

/**
 *
 */
function TroupeMentionCountStategy(options) {
  var self = this;
  var userId = options.userId || options.currentUserId;

  this.preload = function(troupeIds, callback) {
    var operation;
    if(troupeIds.length <= 5) {
      operation = unreadItemService.getUserMentionCountsForTroupeIds(userId, troupeIds);
    } else {
      operation = unreadItemService.getUserMentionCounts(userId);
    }

    operation
      .then(function(result) {
        self.mentionCounts = result;
      })
      .nodeify(callback);
  };

  this.map = function(id) {
    return self.mentionCounts[id] ? self.mentionCounts[id] : 0;
  };
}
TroupeMentionCountStategy.prototype = {
  name: 'TroupeMentionCountStategy'
};

function LastTroupeAccessTimesForUserStrategy(options) {
  var userId = options.userId || options.currentUserId;
  var timesIndexed;

  this.preload = function(data, callback) {
    return recentRoomService.getTroupeLastAccessTimesForUserExcludingHidden(userId)
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
    recentRoomService.findFavouriteTroupesForUser(userId)
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

    uris = _.uniq(uris);

    return billingService.findActiveOrgPlans(uris)
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

function TroupeStrategy(options) {
  if(!options) options = {};

  var currentUserId = options.currentUserId;

  var unreadItemStategy = currentUserId && !options.skipUnreadCounts ? new AllUnreadItemCountStategy(options) : null;
  var mentionCountStrategy = currentUserId && !options.skipUnreadCounts ? new TroupeMentionCountStategy(options) : null;
  var lastAccessTimeStategy = currentUserId ? new LastTroupeAccessTimesForUserStrategy(options) : null;
  var favouriteStrategy = currentUserId ? new FavouriteTroupesForUserStrategy(options) : null;
  var lurkStrategy = currentUserId ? new LurkTroupeForUserStrategy(options) : null;
  var userIdStategy = new UserIdStrategy(options);
  var proOrgStrategy = new ProOrgStrategy(options);

  this.preload = function(items, callback) {

    var strategies = [];
    var troupeIds = items.map(function(i) { return i.id; });

    if(unreadItemStategy) {
      strategies.push({
        strategy: unreadItemStategy,
        data: troupeIds
      });
    }

    if(mentionCountStrategy) {
      strategies.push({
        strategy: mentionCountStrategy,
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

    var userIds;
    // if(options.mapUsers) {
    //   userIds = _.flatten(items.map(function(troupe) { return troupe.getUserIds(); }));
    // } else {
      userIds = _.flatten(items.map(function(troupe) {
          if(troupe.oneToOne) return troupe.oneToOneUsers.map(function(f) { return f.userId; });
        })).filter(function(f) {
          return !!f;
        });

    // }

    strategies.push({
      strategy: userIdStategy,
      data: userIds
    });

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

    return {
      id: item.id || item._id,
      name: troupeName,
      topic: item.topic,
      uri: item.uri,
      oneToOne: item.oneToOne,
      userCount: item.userCount,
      // users: options.mapUsers && !item.oneToOne ? item.users.map(function(troupeUser) { return userIdStategy.map(troupeUser.userId); }) : undefined,
      user: otherUser,
      unreadItems: unreadItemStategy ? unreadItemStategy.map(item.id) : undefined,
      mentions: mentionCountStrategy ? mentionCountStrategy.map(item.id) : undefined,
      lastAccessTime: lastAccessTimeStategy ? lastAccessTimeStategy.map(item.id) : undefined,
      favourite: favouriteStrategy ? favouriteStrategy.map(item.id) : undefined,
      lurk: lurkStrategy ? !item.oneToOne && lurkStrategy.map(item.id) : undefined,
      url: troupeUrl,
      githubType: item.githubType,
      security: item.security,
      premium: isPro,
      noindex: item.noindex,
      tags: item.tags,
      v: getVersion(item)
    };
  };
}

TroupeStrategy.prototype = {
  name: 'TroupeStrategy'
};

module.exports = TroupeStrategy;
