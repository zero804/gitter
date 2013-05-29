/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService = require("../services/user-service");
var chatService = require("../services/chat-service");
var troupeService = require("../services/troupe-service");
var fileService = require("../services/file-service");
var unreadItemService = require("../services/unread-item-service");
var presenceService = require("../services/presence-service");
var Q = require("q");
var _ = require("underscore");
var handlebars = require('handlebars');
var winston = require("winston");
var collections = require("../utils/collections");
var cdn = require('../web/cdn');
var predicates = collections.predicates;

// TODO: Fix this, use the CDN and code sign URLS
function privateCdn(url) {
  return "/" + url;
}

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

function concatArraysOfArrays(a) {
  var result = [];
  for(var i = 0; i < a.length; i++) {
    result = result.concat(a[i]);
  }
  return result;
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

function UserStrategy(options) {
  options = options ? options : {};
  var onlineUsers;

  this.preload = function(users, callback) {
    if(options.showPresenceForTroupeId) {
      presenceService.findOnlineUsersForTroupe(options.showPresenceForTroupeId, function(err, result) {

        if(err) return callback(err);
        onlineUsers = result;
        callback(null, true);
      });
    } else {
      callback(null, true);
    }
  };

  this.map = function(user) {
    if(!user) return null;

    function getAvatarUrl(size) {
      if(user.avatarVersion === 0) {
        return user.gravatarImageUrl;
      }
      return cdn("avatar/" + size + "/" + user.id + "/" + user.avatarVersion + ".jpg", { notStatic: true });
    }

    function getLocationDescription(named) {
      return named.place + ", " + named.region;
    }

    var location;
    if(true /* options.showLocation */ && user.location.timestamp) {
      location = {
        description: getLocationDescription(user.location.named),
        timestamp: formatDate(user.location.timestamp),
        countryCode: user.location.countryCode
      };
    } else {
      location = undefined;
    }

    return {
      id: user.id,
      displayName: user.displayName,
      email: options.includeEmail ? user.email : undefined,
      avatarUrlSmall: getAvatarUrl('s'),
      avatarUrlMedium: getAvatarUrl('m'),
      location: location,
      online: onlineUsers ? onlineUsers.indexOf(user.id) >= 0 : undefined,
      v: getVersion(user)
    };
  };
}

function UserIdStrategy(options) {
  var self = this;

  var userStategy = new UserStrategy(options);

  this.preload = function(ids, callback) {
    userService.findByIds(_.uniq(ids), function(err, users) {
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

function FileStrategy(options) {
  if(!options) options = {};

  var unreadItemStategy = new UnreadItemStategy({ itemType: 'file' });
  var userStategy = new UserIdStrategy();

  this.preload = function(items, callback) {
    var users = items.map(function(i) { return i.versions.map(function(j) { return j.creatorUserId; }); });
    users = _.flatten(users, true);
    users = _.uniq(users);

    var strategies = [{
      strategy: userStategy,
      data: users
    }];

    if(options.currentUserId) {
      strategies.push({
        strategy: unreadItemStategy,
        data: { userId: options.currentUserId, troupeId: options.troupeId }
      });
    }

    execPreloads(strategies, callback);
  };


  this.map = function(item) {
    if(!item) return null;
    item = item.toObject();

    return {
      id: item._id,
      fileName: item.fileName,
      mimeType: item.mimeType,
      versions: item.versions.map(function(item, index) {
        return {
          versionNumber: index + 1,
          creatorUser: userStategy.map(item.creatorUserId),
          createdDate: formatDate(item.createdDate),
          thumbnailStatus: item.thumbnailStatus,
          source: item.source,
          deleted: item.deleted
        };
      }),
      url: privateCdn('troupes/' + encodeURIComponent(item.troupeId) + '/downloads/' + encodeURIComponent(item.fileName), { notStatic: true }),
      previewMimeType: item.previewMimeType,
      embeddedViewType: item.embeddedViewType,
      embeddedUrl: privateCdn('troupes/' + encodeURIComponent(item.troupeId) + '/embedded/' + encodeURIComponent(item.fileName), { notStatic: true }),
      thumbnailUrl: privateCdn('troupes/' + encodeURIComponent(item.troupeId) + '/thumbnails/' + encodeURIComponent(item.fileName) + "?version=" + item.versions.length, { notStatic: true }),
      unread: options.currentUserId ? unreadItemStategy.map(item._id) : true,
      v: getVersion(item)
    };
  };

}

function FileIdStrategy(/*options*/) {
  var fileStrategy = new FileStrategy();
  var self = this;

  this.preload = function(ids, callback) {
    fileService.findByIds(ids, function(err, files) {
      if(err) {
        winston.error("Error loading files", { exception: err });
        return callback(err);
      }
      self.files = collections.indexById(files);

      execPreloads([{
        strategy: fileStrategy,
        data: files
      }], callback);

    });
  };

  this.map = function(fileId) {
    var file = self.files[fileId];
    if(!file) {
      winston.warn("Unable to locate fileId ", { fileId: fileId });
      return null;
    }

    return fileStrategy.map(file);
  };

}

function FileIdAndVersionStrategy() {
  var fileIdStrategy = new FileIdStrategy();

  this.preload = function(fileAndVersions, callback) {
    var fileIds = _(fileAndVersions).chain()
                    .map(function(e) { return e.fileId; })
                    .uniq()
                    .value();

    execPreloads([{
      strategy: fileIdStrategy,
      data: fileIds
    }], callback);
  };

  this.map = function(fileAndVersion) {
    var file = fileIdStrategy.map(fileAndVersion.fileId);

    if(!file) {
      winston.warn("Unable to locate file ", { fileId: fileAndVersion.fileId });
      return null;
    }

    var fileVersion = file.versions[fileAndVersion.version - 1];
    if(!fileVersion) {
      winston.warn("Unable to locate fileVersion ", fileAndVersion.version);
      return null;
    }

    // TODO: there is a slight performance gain to be made by not loading all the file versions
    // and only loading the file version (and users) for the needed version
    delete file['versions'];

    return _.extend(file, fileVersion);
  };
}

function EmailStrategy() {
  var userStategy = new UserIdStrategy();
  var fileStrategy = new FileIdAndVersionStrategy();

  this.preload = function(items, callback) {

    var allUserIds = _(items).chain()
      .map(function(i) { return i.fromUserId; })
      .uniq()
      .value();

    var allFileAndVersionIds = _(items).chain()
      .map(function(e) { return e.attachments; })
      .filter(predicates.notNull)
      .flatten()
      .map(function(f) { return { fileId: f.fileId, version: f.version }; })
      .uniq()
      .value();

    execPreloads([{
      strategy: userStategy,
      data: allUserIds
    },{
      strategy: fileStrategy,
      data: allFileAndVersionIds
    }], callback);

  };

  this.map = function(item) {
    return {
      id: item.id,
      from: userStategy.map(item.fromUserId),
      subject: item.subject,
      date: formatDate(item.date),
      preview: item.preview,
      mail: item.mail,
      attachments: _.map(item.attachments, fileStrategy.map),
      v: getVersion(item)
    };
  };
}

function ConversationStrategy()  {
  var emailStrategy = new EmailStrategy();

  this.preload = function(items, callback) {
    var allEmails = concatArraysOfArrays(items.map(function(i) { return i.emails; }));

    execPreloads([{
      strategy: emailStrategy,
      data: allEmails
    }], callback);
  };

  this.map = function(item) {
    return {
      id: item.id,
      troupeId: item.troupeId,
      updated: formatDate(item.updated),
      subject: item.subject,
      emails: item.emails.map(emailStrategy.map),
      v: getVersion(item)
    };
  };
}

function ConversationMinStrategy()  {
  var userStategy = new UserIdStrategy();

  this.preload = function(items, callback) {
    var lastUsers = items.map(function(i) { return i.emails[i.emails.length - 1].fromUserId; });

    execPreloads([{
      strategy: userStategy,
      data: _.uniq(lastUsers)
    }], callback);
  };

  this.map = function(item) {
    var hasAttachments = false;
    item.emails.forEach(function(i) {
      hasAttachments = hasAttachments || i.attachments.length > 0;
    });

    var preview = "";
    var lastSender = null;
    if(item.emails) {
      var lastEmail = item.emails[item.emails.length - 1];
      preview = lastEmail.preview;
      lastSender = userStategy.map(lastEmail.fromUserId);
    }

    return {
      id: item.id,
      troupeId: item.troupeId,
      updated: formatDate(item.updated),
      subject: item.subject,
      emailCount: item.emails.length,
      preview: preview,
      lastSender: lastSender,
      hasAttachments: hasAttachments,
      v: getVersion(item)
    };
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

function AllUnreadItemCountStategy(options) {
  var self = this;
  var userId = options.userId;

  this.preload = function(troupeIds, callback) {
    var promises = troupeIds.map(function(i) {
      var deferred = Q.defer();
      unreadItemService.getUserUnreadCounts(userId, i, deferred.makeNodeResolver());
      return deferred.promise;
    });

    Q.all(promises)
        .then(function(results) {
          self.unreadCounts = {};
          results.forEach(function(counts, index) {
            var troupeId = troupeIds[index];
            var total = 0;
            _.keys(counts).forEach(function(key) {
              total = total + counts[key];
            });

            self.unreadCounts[troupeId] = total;
          });
          callback();
        })
        .fail(function(err) {
          callback(err);
        });

  };

  this.map = function(id) {
    return self.unreadCounts[id] ? self.unreadCounts[id] : 0;
  };
}

function LastTroupeAccessTimesForUserStrategy(options) {
  var self = this;
  var userId = options.userId;

  this.preload = function(data, callback) {
    userService.getTroupeLastAccessTimesForUser(userId, function(err, times) {
      if(err) return callback(err);
      self.times = times;
      callback();
    });
  };

  this.map = function(id) {
    return self.times[id] ? self.times[id] : undefined;
  };
}

function FavouriteTroupesForUserStrategy(options) {
  var self = this;
  var userId = options.userId;

  this.preload = function(data, callback) {
    troupeService.findFavouriteTroupesForUser(userId, function(err, favs) {
      if(err) return callback(err);
      self.favs = favs;
      callback();
    });
  };

  this.map = function(id) {
    return self.favs[id] ? true : undefined;
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
        data: _.uniq(users)
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
        data: _.uniq(items.map(function(i) { return i.toTroupeId; }))
      });
    }

    execPreloads(strategies, callback);
  };

  this.map = function(item) {
    return {
      id: item._id,
      text: item.text,
      sent: formatDate(item.sent),
      editedAt: formatDate(item.editedAt),
      fromUser: options.user ? options.user : userStategy.map(item.fromUserId),
      unread: options.currentUserId ? unreadItemStategy.map(item._id) : true,
      troupe: troupeStrategy ? troupeStrategy.map(item.toTroupeId) : undefined,
      readBy: item.readBy ? item.readBy.length : undefined,
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
function compileTemplates(map) {
  for(var k in map) {
    if(map.hasOwnProperty(k)) {
      map[k] = handlebars.compile(map[k]);
    }
  }
  return map;
}

/* TODO: externalize and internationalise this! */
var notificationTemplates = compileTemplates({
  "mail:new": "New email with subject \"{{subject}}\" from {{from}}" ,
  "file:createVersion": "Version {{version}}  of {{fileName}} created.",
  "file:createNew": "New file {{fileName}} created."
});

var notificationLinkTemplates = compileTemplates({
  "mail:new": "#mail/{{emailId}}",
  "file:createVersion": "#files",
  "file:createNew": "#files"
});

function NotificationStrategy() {

  this.preload = function(items, callback) {
    callback(null);
  };


  this.map = function(item) {
    var templateData = {};
    _.extend(templateData, item.data, { troupeId: item.troupeId });

    var textTemplate = notificationTemplates[item.notificationName];
    var linkTemplate = notificationLinkTemplates[item.notificationName];

    if(!textTemplate || !linkTemplate) {
      winston.warn("Unknown notification ", { notificationName: item.notificationName});
      return null;
    }

    return {
      id: item.id,
      troupeId: item.troupeId,
      createdDate: item.createdDate,
      notificationText: textTemplate(templateData),
      notificationLink: linkTemplate(templateData)
    };
  };
}

function InviteStrategy(options) {
  if(!options) options = {};

  this.preload = function(items, callback) {
    callback(null);
  };

  this.map = function(item) {
    return {
      // TODO will need to include the troupe url here
      id: item._id,
      displayName: item.displayName,
      email: item.email,
      avatarUrlSmall: '/images/2/avatar-default.png', // TODO: fix
      v: getVersion(item)
    };
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

function TroupeStrategy(options) {
  if(!options) options = {};

  var currentUserId = options.currentUserId;

  var unreadItemStategy = options.currentUserId ? new AllUnreadItemCountStategy({ userId: options.currentUserId }) : null;
  var lastAccessTimeStategy = options.currentUserId ? new LastTroupeAccessTimesForUserStrategy({ userId: options.currentUserId }) : null;
  var favouriteStrategy = options.currentUserId ? new FavouriteTroupesForUserStrategy({ userId: options.currentUserId }) : null;

  var userIdStategy = options.mapUsers || currentUserId ? new UserIdStrategy() : null;
  this.preload = function(items, callback) {

    var strategies = [];

    if(unreadItemStategy) {
      var troupeIds = items.map(function(i) { return i.id; });

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

    if(userIdStategy) {

      var userIds;
      if(options.mapUsers) {
        userIds = _.flatten(items.map(function(troupe) { return troupe.getUserIds(); }));
      } else {
        userIds = [];
      }

      // If the currentUserOption has been set, then we will output
      // a user node on the serialized troupe.
      if(options.currentUserId) {
        items.forEach(function(troupe) {
          if(troupe.oneToOne) {
            userIds = userIds.concat(troupe.getUserIds());
          }
        });
      }

      userIds = _.uniq(userIds);

      strategies.push({
        strategy: userIdStategy,
        data: userIds
      });

    }

    execPreloads(strategies, callback);
  };

  function mapOtherUser(users) {
    var otherUser = users.filter(function(troupeUser) {
      return troupeUser.userId != currentUserId;
    })[0];
    if(otherUser) {
      return userIdStategy.map(otherUser.userId);
    }
  }

  this.map = function(item) {
    var otherUser = item.oneToOne && currentUserId ? mapOtherUser(item.users) : undefined;
    var troupeName, troupeUrl;
    if(item.oneToOne) {
      if(otherUser) {
        troupeName = otherUser.displayName;
        troupeUrl = "/one-one/" + otherUser.id;
      } else {
        winston.verbose("Unable to map troupe bits as something has gone horribly wrong");
        // This should technically never happen......
        troupeName = null;
        troupeUrl = null;
      }
    } else {
        troupeName = item.name;
        troupeUrl = "/" + item.uri;
    }

    return {
      id: item.id,
      name: troupeName,
      uri: item.uri,
      oneToOne: item.oneToOne,
      users: options.mapUsers && !item.oneToOne ? item.users.map(function(troupeUser) { return userIdStategy.map(troupeUser.userId); }) : undefined,
      user: otherUser,
      unreadItems: unreadItemStategy ? unreadItemStategy.map(item.id) : undefined,
      lastAccessTime: lastAccessTimeStategy ? lastAccessTimeStategy.map(item.id) : undefined,
      favourite: favouriteStrategy ? favouriteStrategy.map(item.id) : undefined,
      url: troupeUrl,
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
    if(!troupeId) {
      winston.warn("Unable to locate troupeId ", { troupeId: troupeId });
      return null;
    }

    return troupeStrategy.map(troupe);
  };

}

function RequestStrategy(options) {
  if(!options) options = {};

  var userStategy = new UserIdStrategy();
  var unreadItemStategy = new UnreadItemStategy({ itemType: 'request' });

  this.preload = function(requests, callback) {
    var userIds =  requests.map(function(item) { return item.userId; });

    var strategies = [{
      strategy: userStategy,
      data: _.uniq(userIds)
    }];

    if(options.currentUserId) {
      strategies.push({
        strategy: unreadItemStategy,
        data: { userId: options.currentUserId, troupeId: options.troupeId }
      });
    }
    execPreloads(strategies, callback);

  };

  this.map = function(item) {
    return {
      id: item._id,
      user: userStategy.map(item.userId),
      unread: options.currentUserId ? unreadItemStategy.map(item._id) : true,
      v: getVersion(item)
    };
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

    callback(null, pkg(items.map(strat.map)));
  });

}

// TODO: deprecate this....
function getStrategy(modelName, toCollection) {
  switch(modelName) {
    case 'conversation':
      return toCollection ? ConversationMinStrategy : ConversationStrategy;
    case 'file':
      return FileStrategy;
    case 'fileId':
      return FileIdStrategy;
    case 'notification':
      return NotificationStrategy;
    case 'chat':
      return ChatStrategy;
    case 'chatId':
      return ChatIdStrategy;
    case 'invite':
      return InviteStrategy;
    case 'request':
      return RequestStrategy;
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

    case 'ConversationSchema':
      strategy = new ConversationMinStrategy();
      break;

    case 'EmailSchema':
      strategy = new EmailStrategy();
      break;

    case 'InviteSchema':
      strategy = new InviteStrategy();
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

    case 'NotificationSchema':
      strategy = new NotificationStrategy();
      break;
  }

  if(!strategy) return callback("No strategy for " + schema.schemaTypeName);


  serialize(model, strategy, callback);
}

module.exports = {
  UserStrategy: UserStrategy,
  UserIdStrategy: UserIdStrategy,
  ConversationStrategy: ConversationStrategy,
  ConversationMinStrategy: ConversationMinStrategy,
  NotificationStrategy: NotificationStrategy,
  FileStrategy: FileStrategy,
  ChatStrategy: ChatStrategy,
  ChatIdStrategy: ChatIdStrategy,
  InviteStrategy: InviteStrategy,
  RequestStrategy: RequestStrategy,
  TroupeStrategy: TroupeStrategy,
  TroupeIdStrategy: TroupeIdStrategy,
  TroupeUserStrategy: TroupeUserStrategy,
  SearchResultsStrategy: SearchResultsStrategy,
  getStrategy: getStrategy,
  serialize: serialize,
  serializeModel: serializeModel
};