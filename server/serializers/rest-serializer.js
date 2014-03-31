/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService       = require("../services/user-service");
var chatService       = require("../services/chat-service");
var troupeService     = require("../services/troupe-service");
var unreadItemService = require("../services/unread-item-service");
var presenceService   = require("../services/presence-service");
var recentRoomService = require('../services/recent-room-service');
var Q                 = require("q");
var _                 = require("underscore");
var winston           = require('../utils/winston');
var collections       = require("../utils/collections");
var GitHubRepoService = require('../services/github/github-repo-service');

function formatDate(d) {
  return d ? d.toISOString() : null;
}

function getVersion(item) {
  if(!item) return undefined;
  var v = item.get ? item.get('_tv') : item._tv;
  if(!v) return undefined;
  if(v.valueOf) v = v.valueOf();
  return v ? v : undefined;
}

function execPreloads(preloads, callback) {
  if(!preloads) return callback();

  var promises = preloads.map(function(i) {
    var deferred = Q.defer();
    i.strategy.preload(i.data, deferred.makeNodeResolver());
    return deferred.promise;
  });

  Q.all(promises)
      .then(function() {
        callback();
      })
      .fail(function(err) {
        callback(err);
      });
}

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
      avatarUrlSmall: user.gravatarImageUrl,
      avatarUrlMedium: user.gravatarImageUrl,
      scopes: scopes,
      online: userPresenceInTroupeStrategy && userPresenceInTroupeStrategy.map(user.id) || undefined,
      role: userRoleInTroupeStrategy && userRoleInTroupeStrategy.map(user.username) || undefined,
      v: getVersion(user)
    };
  };
}

function UserIdStrategy(options) {
  var self = this;

  var userStategy = new UserStrategy(options);

  this.preload = function(ids, callback) {
    userService.findByIds(ids, function(err, users) {
      if(err) {
        winston.error("Error loading users", { exception: err });
        return callback(err);
      }

      self.users = collections.indexById(users);
      userStategy.preload(users, callback);
    });
  };

  this.map = function(id) {
    var user = self.users[id];
    return userStategy.map(user);
  };
}

function UnreadItemStategy(options) {
  var self = this;
  var itemType = options.itemType;

  this.preload = function(data, callback) {
    unreadItemService.getUnreadItems(data.userId, data.troupeId, itemType, function(err, ids) {
      if(err) return callback(err);

      var hash = {};
      ids.forEach(function(id) {
        hash[id] = true;
      });

      self.unreadIds = hash;
      callback(null);
    });
  };

  this.map = function(id) {
    return !!self.unreadIds[id];
  };
}

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

function EventStrategy(options) {
  if(!options) options = {};

  var userStategy = options.user ? null : new UserIdStrategy();
  var troupeStrategy = options.includeTroupe ? new TroupeIdStrategy(options) : null;

  this.preload = function(items, callback) {
    var users = items.map(function(i) { return i.fromUserId; });

    var strategies = [];

    // If the user is fixed in options, we don't need to look them up using a strategy...
    if(userStategy) {
      strategies.push({
        strategy: userStategy,
        data: users
      });
    }

    if(troupeStrategy) {
      strategies.push({
        strategy: troupeStrategy,
        data: items.map(function(i) { return i.toTroupeId; })
      });
    }

    execPreloads(strategies, callback);
  };

  this.map = function(item) {
    return {
      id: item._id,
      text: item.text,
      html: item.html,
      sent: formatDate(item.sent),
      editedAt: formatDate(item.editedAt),
      fromUser: options.user ? options.user : userStategy.map(item.fromUserId),
      troupe: troupeStrategy ? troupeStrategy.map(item.toTroupeId) : undefined,
      meta: item.meta || {},
      payload: item.payload || {},
      v: getVersion(item)
    };

  };
}


function ChatStrategy(options)  {
  if(!options) options = {};

  var userStategy = options.user ? null : new UserIdStrategy();
  var unreadItemStategy = new UnreadItemStategy({ itemType: 'chat' });
  var troupeStrategy = options.includeTroupe ? new TroupeIdStrategy(options) : null;

  this.preload = function(items, callback) {
    var users = items.map(function(i) { return i.fromUserId; });

    var strategies = [];

    // If the user is fixed in options, we don't need to look them up using a strategy...
    if(userStategy) {
      strategies.push({
        strategy: userStategy,
        data: users
      });
    }

    if(options.currentUserId) {
      strategies.push({
        strategy: unreadItemStategy,
        data: { userId: options.currentUserId, troupeId: options.troupeId }
      });
    }

    if(troupeStrategy) {
      strategies.push({
        strategy: troupeStrategy,
        data: items.map(function(i) { return i.toTroupeId; })
      });
    }

    execPreloads(strategies, callback);
  };

  this.map = function(item) {
    return {
      id: item._id,
      text: item.text,
      html: item.html,
      sent: formatDate(item.sent),
      editedAt: formatDate(item.editedAt),
      fromUser: options.user ? options.user : userStategy.map(item.fromUserId),
      unread: options.currentUserId ? unreadItemStategy.map(item._id) : true,
      troupe: troupeStrategy ? troupeStrategy.map(item.toTroupeId) : undefined,
      readBy: item.readBy ? item.readBy.length : undefined,
      urls: item.urls || [],
      mentions: item.mentions ? item.mentions.map(function(m) {
          return {
            screenName: m.screenName,
            userId: m.userId
          };
        }) : [],
      issues: item.issues || [],
      meta: item.meta || {},
      v: getVersion(item)
    };

  };
}


function ChatIdStrategy(options) {
  var chatStrategy = new ChatStrategy(options);
  var self = this;

  this.preload = function(ids, callback) {
    chatService.findByIds(ids, function(err, chats) {
      if(err) {
        winston.error("Error loading chats", { exception: err });
        return callback(err);
      }
      self.chats = collections.indexById(chats);

      execPreloads([{
        strategy: chatStrategy,
        data: chats
      }], callback);

    });
  };

  this.map = function(chatId) {
    var chat = self.chats[chatId];
    if(!chat) {
      winston.warn("Unable to locate chatId ", { chatId: chatId });
      return null;
    }

    return chatStrategy.map(chat);
  };

}

function TroupeUserStrategy(options) {
  var userIdStategy = new UserIdStrategy(options);

  this.preload = function(troupeUsers, callback) {
    var userIds = troupeUsers.map(function(troupeUser) { return troupeUser.userId; });
    userIdStategy.preload(userIds, callback);
  };

  this.map = function(troupeUser) {
    return userIdStategy.map(troupeUser.userId);
  };
}

function GitHubOrgStrategy(options) {

  var troupeStrategy = new TroupeStrategy(options);
  var self = this;

  this.preload = function(orgs, callback) {
    var _orgs = _.map(orgs, function(org) { return org.login; });

    troupeService.findAllByUri(_orgs, function(err, troupes) {
      if (err) callback(err);

      self.troupes = collections.indexByProperty(troupes, 'uri');

      execPreloads([{
        strategy: troupeStrategy,
        data: troupes
      }], callback);
    });
  };

  this.map = function(item) {
    var room = self.troupes[item.login];
    return {
      id: item.id,
      name: item.login,
      avatar_url: item.avatar_url,
      room: room ? troupeStrategy.map(room) : undefined
    };
  };

}

function GitHubRepoStrategy(options) {

  var troupeStrategy = new TroupeStrategy(options);
  var self = this;

  this.preload = function(userAdminRepos, callback) {
    var repos = userAdminRepos.map(function(repo) { return repo.full_name; });

    troupeService.findAllByUri(repos, function(err, troupes) {
      if (err) callback(err);

      self.troupes = collections.indexByProperty(troupes, 'uri');

      execPreloads([{
        strategy: troupeStrategy,
        data: troupes
      }], callback);
    });
  };

  this.map = function(item) {
    var room = self.troupes[item.full_name];
    return {
      id:       item.id,
      name:     item.full_name,
      uri:      item.full_name,
      private:  item.private,
      room:     room ? troupeStrategy.map(room) : undefined
    };
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

function TroupeStrategy(options) {
  if(!options) options = {};

  var currentUserId = options.currentUserId;

  var unreadItemStategy = currentUserId ? new AllUnreadItemCountStategy(options) : null;
  var mentionCountStrategy = currentUserId ? new TroupeMentionCountStategy(options) : null;
  var lastAccessTimeStategy = currentUserId ? new LastTroupeAccessTimesForUserStrategy(options) : null;
  var favouriteStrategy = currentUserId ? new FavouriteTroupesForUserStrategy(options) : null;
  var lurkStrategy = currentUserId ? new LurkTroupeForUserStrategy(options) : null;
  var userIdStategy = new UserIdStrategy(options);

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
      v: getVersion(item)
    };
  };
}

function TroupeIdStrategy(options) {
  var troupeStrategy = new TroupeStrategy(options);
  var self = this;

  this.preload = function(ids, callback) {
    troupeService.findByIds(ids, function(err, troupes) {
      if(err) {
        winston.error("Error loading troupes", { exception: err });
        return callback(err);
      }
      self.troupes = collections.indexById(troupes);

      execPreloads([{
        strategy: troupeStrategy,
        data: troupes
      }], callback);

    });
  };

  this.map = function(troupeId) {
    var troupe = self.troupes[troupeId];
    if(!troupe) {
      winston.warn("Unable to locate troupeId ", { troupeId: troupeId });
      return null;
    }

    return troupeStrategy.map(troupe);
  };

}

function SearchResultsStrategy(options) {
  var resultItemStrategy = options.resultItemStrategy;

  this.preload = function(searchResults, callback) {
    var items = _.flatten(searchResults.map(function(i) { return i.results; }), true);

    var strategies = [{
      strategy: resultItemStrategy,
      data: items
    }];

    execPreloads(strategies, callback);
  };

  this.map = function(item) {
    return {
      hasMoreResults: item.hasMoreResults,
      limit: item.limit,
      skip: item.skip,
      results: item.results.map(function(i) { return resultItemStrategy.map(i); })
    };
  };

}

/* This method should move */
function serialize(items, strat, callback) {
  if(!items) return callback(null, null);

  var single = !Array.isArray(items);
  if(single) {
    items = [ items ];
  }

  function pkg(i) {
    return single ? i[0] : i;
  }

  strat.preload(items, function(err) {
    if(err) {
      winston.error("Error during preload", { exception: err });
      return callback(err);
    }

    callback(null, pkg(items.map(strat.map).filter(function(f) { return f !== undefined; })));
  });
}

function serializeExcludeNulls(items, strat, callback) {
  var single = !Array.isArray(items);

  return serialize(items, strat, function(err, results) {
    if(err) return callback(err);
    if(single) return callback(null, results);

    return callback(null, results.filter(function(f) { return !!f; }));
  });
}

function serializeQ(items, strat) {
  var d = Q.defer();
  serialize(items, strat, d.makeNodeResolver());
  return d.promise;
}


// TODO: deprecate this....
function getStrategy(modelName) {
  switch(modelName) {
    case 'chat':
      return ChatStrategy;
    case 'chatId':
      return ChatIdStrategy;
    case 'troupe':
      return TroupeStrategy;
    case 'troupeId':
      return TroupeIdStrategy;
    case 'user':
      return UserStrategy;
  }
}

function serializeModel(model, callback) {
  if(model === null) return callback(null, null);
  var schema = model.schema;
  if(!schema) return callback("Model does not have a schema");
  if(!schema.schemaTypeName) return callback("Schema does not have a schema name");

  var strategy;

  switch(schema.schemaTypeName) {
    case 'UserSchema':
      strategy = new UserStrategy();
      break;

    case 'TroupeSchema':
      strategy = new TroupeStrategy();
      break;

    case 'TroupeUserSchema':
      strategy = new TroupeUserStrategy();
      break;

    case 'ChatMessageSchema':
      strategy = new ChatStrategy();
      break;

    case 'EventSchema':
      strategy = new EventStrategy();
      break;

  }

  if(!strategy) return callback("No strategy for " + schema.schemaTypeName);


  serialize(model, strategy, callback);
}


module.exports = {
  UserStrategy: UserStrategy,
  UserIdStrategy: UserIdStrategy,
  ChatStrategy: ChatStrategy,
  EventStrategy: EventStrategy,
  ChatIdStrategy: ChatIdStrategy,
  TroupeStrategy: TroupeStrategy,
  TroupeIdStrategy: TroupeIdStrategy,
  TroupeUserStrategy: TroupeUserStrategy,
  SearchResultsStrategy: SearchResultsStrategy,
  getStrategy: getStrategy,
  execPreloads: execPreloads,
  serialize: serialize,
  serializeExcludeNulls: serializeExcludeNulls,
  serializeQ: serializeQ,
  serializeModel: serializeModel,
  GitHubOrgStrategy: GitHubOrgStrategy,
  GitHubRepoStrategy: GitHubRepoStrategy
};
