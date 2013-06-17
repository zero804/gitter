/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService = require("../services/user-service");
var chatService = require("../services/chat-service");
var troupeService = require("../services/troupe-service");
var fileService = require("../services/file-service");
var Q = require("q");
var _ = require("underscore");
var winston = require("winston");
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
      displayName: user.displayName
    };
  };
}

function FileStrategy(options) {
  if(!options) options = {};

  var userStategy = new UserIdStrategy();
  var troupeStrategy = new TroupeIdStrategy(options);

  this.preload = function(items, callback) {
    var users = items.map(function(i) { return i.versions[i.versions.length - 1].creatorUserId; });
    users = _.flatten(users, true);
    users = _.uniq(users);

    var troupeIds = items.map(function(i) { return i.troupeId; });
    troupeIds = _.uniq(troupeIds);

    var strategies = [{
      strategy: userStategy,
      data: users
    }, {
      strategy: troupeStrategy,
      data: troupeIds
    }];

    execPreloads(strategies, callback);
  };


  this.map = function(item) {
    if(!item) return null;
    item = item.toObject();

    var versionIndex = 1;
    function narrowFileVersion(item) {
      return {
        versionNumber: versionIndex++,
        creatorUser: userStategy.map(item.creatorUserId),
        createdDate: item.createdDate
      };
    }

    return {
      id: item._id,
      fileName: item.fileName,
      mimeType: item.mimeType,
      latestVersion: narrowFileVersion(item.versions[item.versions.length - 1]),
      url: '/troupes/' + encodeURIComponent(item.troupeId) + '/downloads/' + encodeURIComponent(item.fileName),
      troupe: troupeStrategy.map(item.troupeId)
    };
  };

}


function ChatStrategy(options)  {
  if(!options) options = {};

  var userStategy = new UserIdStrategy(options);
  var troupeStrategy = new TroupeIdStrategy(options);

  this.preload = function(items, callback) {
    var users = items.map(function(i) { return i.fromUserId; });

    var strategies = [];
    strategies.push({
      strategy: userStategy,
      data: _.uniq(users)
    });

    strategies.push({
      strategy: troupeStrategy,
      data: _.uniq(items.map(function(i) { return i.toTroupeId; }))
    });

    execPreloads(strategies, callback);
  };

  this.map = function(item) {
    return {
      id: item._id,
      text: item.text,
      sent: item.sent,
      fromUser: options.user ? options.user : userStategy.map(item.fromUserId),
      troupe: troupeStrategy ? troupeStrategy.map(item.toTroupeId) : undefined
    };

  };
}


function TroupeStrategy(options) {
  if(!options) options = {};

  var senderUserId = options.senderUserId;

  this.preload = function(items, callback) {
    callback();
  };

  function getOtherUserUrl(item) {
    if(!senderUserId) return null;
    var userIds = item.getUserIds();
    var otherUserId = userIds.filter(function(userId) { return userId != senderUserId; })[0];
    if(otherUserId) return "/one-one/" + otherUserId;
    return null;
  }

  this.map = function(item) {
    return {
      id: item.id,
      name: item.name,
      uri: item.uri,
      oneToOne: item.oneToOne,
      userIds: item.getUserIds(),
      url: item.oneToOne ? getOtherUserUrl(item) : "/" + item.uri
    };
  };
}

function RequestStrategy(options) {
  if(!options) options = {};

  var userStategy = new UserIdStrategy();
  var troupeStrategy = new TroupeIdStrategy(options);

  this.preload = function(requests, callback) {
    var userIds =  requests.map(function(item) { return item.userId; });
    var troupeIds = requests.map(function(item) { return item.troupeId; });

    var strategies = [{
      strategy: userStategy,
      data: _.uniq(userIds)
    },{
      strategy: troupeStrategy,
      data: _.uniq(troupeIds)
    }];

    execPreloads(strategies, callback);

  };

  this.map = function(item) {
    return {
      id: item._id,
      user: userStategy.map(item.userId),
      troupe: troupeStrategy.map(item.troupeId)
    };
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
var FileIdStrategy = idStrategyGenerator(FileStrategy, fileService.findByIds);
var ChatIdStrategy = idStrategyGenerator(ChatStrategy, chatService.findByIds);
var TroupeIdStrategy = idStrategyGenerator(TroupeStrategy, troupeService.findByIds);
var RequestIdStrategy = idStrategyGenerator(RequestStrategy, troupeService.findRequestsByIds);

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

// TODO: deprecate this....
function getStrategy(modelName) {
  switch(modelName) {
    case 'troupeId':
      return TroupeIdStrategy;
    case 'file':
      return FileStrategy;
    case 'fileId':
      return FileIdStrategy;
    case 'chat':
      return ChatStrategy;
    case 'chatId':
      return ChatIdStrategy;
    case 'request':
      return RequestStrategy;
    case 'requestId':
      return RequestIdStrategy;
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

    case 'RequestSchema':
      strategy = new RequestStrategy();
      break;

    case 'ChatMessageSchema':
      strategy = new ChatStrategy();
      break;

    case 'FileSchema':
      strategy = new FileStrategy();
      break;
  }

  if(!strategy) return callback("No strategy for " + schema.schemaTypeName);


  serialize(model, strategy, callback);
}

module.exports = {
  UserStrategy: UserStrategy,
  UserIdStrategy: UserIdStrategy,
  FileStrategy: FileStrategy,
  ChatStrategy: ChatStrategy,
  ChatIdStrategy: ChatIdStrategy,
  RequestStrategy: RequestStrategy,
  TroupeStrategy: TroupeStrategy,
  TroupeIdStrategy: TroupeIdStrategy,
  getStrategy: getStrategy,
  serialize: serialize,
  serializeModel: serializeModel
};