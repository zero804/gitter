/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService = require("../services/user-service");
var chatService = require("../services/chat-service");
var troupeService = require("../services/troupe-service");
var Q = require("q");
var _ = require("underscore");
var winston = require('../utils/winston');
var collections = require("../utils/collections");



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

function UserStrategy(options) {
  options = options ? options : {};

  this.preload = function(users, callback) {
    callback(null, true);
  };

  this.map = function(user) {
    if(!user) return null;

    return {
      id: user.id,
      username: user.username,
      displayName: user.getDisplayName()
    };
  };
}

function ChatStrategy(options)  {
  if(!options) options = {};

  var userStategy = new UserIdStrategy(options);
  var troupeStrategy = options.includeTroupe && new TroupeIdStrategy(options);

  this.preload = function(items, callback) {
    var users = items.map(function(i) { return i.fromUserId; });

    var strategies = [];
    strategies.push({
      strategy: userStategy,
      data: _.uniq(users)
    });

    if(troupeStrategy) {
      var troupeIds = items.map(function(i) { return i.toTroupeId; });
      strategies.push({
        strategy: troupeStrategy,
        data: troupeIds
      });
    }

    execPreloads(strategies, callback);
  };

  this.map = function(item) {
    return {
      id: item._id,
      text: item.text,
      sent: item.sent,
      mentions: item.mentions,
      fromUser: options.user ? options.user : userStategy.map(item.fromUserId),
      troupe: troupeStrategy && troupeStrategy.map(item.toTroupeId)
    };

  };
}


function TroupeStrategy(options) {
  if(!options) options = {};

  var userStategy = new UserIdStrategy(options);

  var recipientUserId = options.recipientUserId;

  this.preload = function(items, callback) {
    var userIds = items.map(function(t) {
                    if(t.oneToOne) {
                      if(recipientUserId) {
                        return getOtherUserId(t);
                      } else {
                        // Return all the userIds if one was not specified
                        return t.getUserIds();
                      }
                    }});

    userIds = _.flatten(userIds).filter(function(f) { return !!f; });
    if(userIds.length) {
      execPreloads([{
        strategy: userStategy,
        data: _.uniq(userIds)
      }], callback);

    } else {
      callback();
    }
  };


  function getOtherUserId(item) {
    if(!recipientUserId) return undefined;
    var userIds = item.getUserIds();
    var userId = userIds.filter(function(userId) { return "" + userId != "" + recipientUserId; })[0];
    return userId;
  }

  function getHomeUrl(user) {
    if(!user) return undefined;
    return "/" + user.username;
  }

  function getUrlUserMap(troupe) {
    if(recipientUserId || !troupe.oneToOne) return undefined;
    var result = {};
    troupe.getUserIds().forEach(function(userId) {
      var user = userStategy.map(userId);
      result[userId] = user && getHomeUrl(user);
    });
    return result;
  }

  function getNameUserMap(troupe) {
    if(recipientUserId || !troupe.oneToOne) return undefined;
    var result = {};
    troupe.getUserIds().forEach(function(userId) {
      var user = userStategy.map(userId);
      result[userId] = user && user.displayName;
    });
    return result;
  }

  this.map = function(item) {
    var user;
    if(item.oneToOne) {
      var otherUserId = getOtherUserId(item);
      user = otherUserId && userStategy.map(otherUserId);
    }

    var t = {
      id: item.id,
      name: item.oneToOne ? user && user.displayName : item.name,
      uri: item.uri,
      oneToOne: item.oneToOne,
      userIds: item.getUserIds(),
      url: item.oneToOne ? user && user && getHomeUrl(user) : "/" + item.uri,
      urlUserMap: item.oneToOne && getUrlUserMap(item),
      nameUserMap: item.oneToOne && getNameUserMap(item)
    };

    return t;
  };
}

function idStrategyGenerator(FullObjectStrategy, loaderFunction) {
  return function IdStrategy(options) {
    var strategy = new FullObjectStrategy(options);
    var self = this;

    this.preload = function(ids, callback) {
      loaderFunction(ids, function(err, fullObjects) {
        if(err) {
          winston.error("Error loading objects", { exception: err });
          return callback(err);
        }

        self.objectHash = collections.indexById(fullObjects);

        execPreloads([{
          strategy: strategy,
          data: fullObjects
        }], callback);

      });
    };

    this.map = function(id) {
      var fullObject = self.objectHash[id];

      if(!fullObject) {
        winston.warn("Unable to locate object ", { id: id });
        return null;
      }

      return strategy.map(fullObject);
    };

  };

}

var UserIdStrategy = idStrategyGenerator(UserStrategy, userService.findByIds);
var ChatIdStrategy = idStrategyGenerator(ChatStrategy, chatService.findByIds);
var TroupeIdStrategy = idStrategyGenerator(TroupeStrategy, troupeService.findByIds);

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

    callback(null, pkg(items.map(strat.map)));
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
    case 'troupeId':
      return TroupeIdStrategy;
    case 'chat':
      return ChatStrategy;
    case 'chatId':
      return ChatIdStrategy;
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

    case 'ChatMessageSchema':
      strategy = new ChatStrategy();
      break;

  }

  if(!strategy) return callback("No strategy for " + schema.schemaTypeName);


  serialize(model, strategy, callback);
}

module.exports = {
  UserStrategy: UserStrategy,
  UserIdStrategy: UserIdStrategy,
  ChatStrategy: ChatStrategy,
  ChatIdStrategy: ChatIdStrategy,
  TroupeStrategy: TroupeStrategy,
  TroupeIdStrategy: TroupeIdStrategy,
  getStrategy: getStrategy,
  serialize: serialize,
  serializeQ: serializeQ,
  serializeModel: serializeModel
};
