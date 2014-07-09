/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var unreadItemService = require("../../services/unread-item-service");
var recentRoomService = require('../../services/recent-room-service');
var billingService    = require('../../services/billing-service');

var _                 = require("underscore");
var winston           = require('../../utils/winston');
var execPreloads      = require('../exec-preloads');
var getVersion        = require('../get-model-version');
var UserIdStrategy    = require('./user-id-strategy');
var env               = require('../../utils/env');

/**
 *
 */
function AllUnreadItemCountStategy(options) {
  var self = this;
  var userId = options.userId || options.currentUserId;

  this.preload = function(troupeIds, callback) {
    unreadItemService.getUserUnreadCountsForTroupeIds(userId, troupeIds, function(err, result) {
      if(err) return callback(err);
      self.unreadCounts = result;
      callback();
    });
  };

  this.map = function(id) {
    return self.unreadCounts[id] ? self.unreadCounts[id] : 0;
  };
}

/**
 *
 */
function TroupeMentionCountStategy(options) {
  var self = this;
  var userId = options.userId || options.currentUserId;

  this.preload = function(troupeIds, callback) {
    unreadItemService.getUserMentionCountsForTroupeIds(userId, troupeIds, function(err, result) {
      if(err) return callback(err);
      self.mentionCounts = result;
      callback();
    });
  };

  this.map = function(id) {
    return self.mentionCounts[id] ? self.mentionCounts[id] : 0;
  };
}


function LastTroupeAccessTimesForUserStrategy(options) {
  var self = this;
  var userId = options.userId || options.currentUserId;

  this.preload = function(data, callback) {
    recentRoomService.getTroupeLastAccessTimesForUser(userId, function(err, times) {
      if(err) return callback(err);
      self.times = times;
      callback();
    });
  };

  this.map = function(id) {
    // No idea why, but sometimes these dates are converted to JSON as {}, hence the weirdness below
    return self.times[id] ? new Date(self.times[id].valueOf()).toISOString() : undefined;
  };
}

function FavouriteTroupesForUserStrategy(options) {
  var self = this;
  var userId = options.userId || options.currentUserId;

  this.preload = function(data, callback) {
    recentRoomService.findFavouriteTroupesForUser(userId, function(err, favs) {
      if(err) return callback(err);
      self.favs = favs;
      callback();
    });
  };

  this.map = function(id) {
    var favs = self.favs[id];
    if(!favs) return undefined;
    if(favs === '1') return 1000;
    return favs;
  };
}

function LurkTroupeForUserStrategy(options) {
  var currentUserId = options.currentUserId;

  this.preload = function(callback) {
    callback();
  };

  this.map = function(troupeUsers) {
    for(var i = 0; i < troupeUsers.length; i++) {
      var troupeUser = troupeUsers[i];

      if(troupeUser.userId == currentUserId) {
        return !!troupeUser.lurk;
      }
    }

    return false;
  };

}

function PremiumRoomStrategy() {
  var premium = {};

  this.preload = function(troupes, callback) {
    var uris = troupes.map(function(troupe) {
      if(!troupe.uri) return; // one-to-one

      return troupe.uri.split('/', 1).shift();
    }).filter(function(f) {
      return !!f;
    });

    var uris = _.uniq(uris);
    return billingService.findActivePlans(uris)
      .then(function(subscriptions) {
        subscriptions.forEach(function(subscription) {
          return premium[subscription.uri] = subscription.plan; // true;
        });

        return true;
      })
      .nodeify(callback);
  }

  this.map = function(troupe) {
    if(!troupe || !troupe.uri) return undefined;

    // TODO remove when premium goes live
    return env.config.get('premium:disabled') ? true : premium[troupe.uri];
  }
}

function TroupeStrategy(options) {
  if(!options) options = {};

  var currentUserId = options.currentUserId;

  var unreadItemStategy = currentUserId ? new AllUnreadItemCountStategy(options) : null;
  var mentionCountStrategy = currentUserId ? new TroupeMentionCountStategy(options) : null;
  var lastAccessTimeStategy = currentUserId ? new LastTroupeAccessTimesForUserStrategy(options) : null;
  var favouriteStrategy = currentUserId ? new FavouriteTroupesForUserStrategy(options) : null;
  var lurkStrategy = currentUserId ? new LurkTroupeForUserStrategy(options) : null;
  var userIdStategy = new UserIdStrategy(options);
  var premiumRoomStrategy = new PremiumRoomStrategy(options);

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
      strategy: premiumRoomStrategy,
      data: items
    });

    var userIds;
    if(options.mapUsers) {
      userIds = _.flatten(items.map(function(troupe) { return troupe.getUserIds(); }));
    } else {
      userIds = _.flatten(items.map(function(troupe) {
          if(troupe.oneToOne) return troupe.getUserIds();
        })).filter(function(f) {
          return !!f;
        });

    }

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

    var troupeName, troupeUrl, otherUser;
    if(item.oneToOne) {
      if(currentUserId) {
        otherUser =  mapOtherUser(item.users);
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
        winston.verbose("Troupe " + item.id + " appears to contain bad users", { users: item.toObject().users });
        // This should technically never happen......
        return undefined;
      }
    } else {
        troupeName = item.uri;
        troupeUrl = "/" + item.uri;
    }

    return {
      id: item.id,
      name: troupeName,
      topic: item.topic,
      uri: item.uri,
      oneToOne: item.oneToOne,
      userCount: item.users.length,
      users: options.mapUsers && !item.oneToOne ? item.users.map(function(troupeUser) { return userIdStategy.map(troupeUser.userId); }) : undefined,
      user: otherUser,
      unreadItems: unreadItemStategy ? unreadItemStategy.map(item.id) : undefined,
      mentions: mentionCountStrategy ? mentionCountStrategy.map(item.id) : undefined,
      lastAccessTime: lastAccessTimeStategy ? lastAccessTimeStategy.map(item.id) : undefined,
      favourite: favouriteStrategy ? favouriteStrategy.map(item.id) : undefined,
      lurk: lurkStrategy ? !item.oneToOne && lurkStrategy.map(item.users) : undefined,
      url: troupeUrl,
      githubType: item.githubType,
      security: item.security,
      premium: premiumRoomStrategy.map(item),
      v: getVersion(item)
    };
  };
}

module.exports = TroupeStrategy;
