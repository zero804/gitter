/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService       = require("../services/user-service");
var chatService       = require("../services/chat-service");
var troupeService     = require("../services/troupe-service");
var inviteService     = require("../services/invite-service");
var fileService       = require("../services/file-service");
var unreadItemService = require("../services/unread-item-service");
var presenceService   = require("../services/presence-service");
var Q                 = require("q");
var _                 = require("underscore");
var handlebars        = require('handlebars');
var winston           = require("winston");
var collections       = require("../utils/collections");
var cdn               = require('../web/cdn');
var predicates        = collections.predicates;
var gravatar          = require('../utils/gravatar');

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
      createRoom: options.includePermissions ? user.permissions.createRoom : undefined,
      scopes: scopes,
      online: onlineUsers ? onlineUsers.indexOf(user.id) >= 0 : undefined,
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

function FileStrategy(options) {
  if(!options) options = {};

  var unreadItemStategy = new UnreadItemStategy({ itemType: 'file' });
  var userStategy = new UserIdStrategy();

  this.preload = function(items, callback) {
    var users = items.map(function(i) { return i.versions.map(function(j) { return j.creatorUserId; }); });
    users = _.flatten(users, true);

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
      .value();

    var allFileAndVersionIds = _(items).chain()
      .map(function(e) { return e.attachments; })
      .filter(predicates.notNull)
      .flatten()
      .map(function(f) { return { fileId: f.fileId, version: f.version }; })
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
      data: lastUsers
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
  var userId = options.userId || options.currentUserId;

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
  var userId = options.userId || options.currentUserId;

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
  var userId = options.userId || options.currentUserId;

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
      sent: formatDate(item.sent),
      editedAt: formatDate(item.editedAt),
      fromUser: options.user ? options.user : userStategy.map(item.fromUserId),
      unread: options.currentUserId ? unreadItemStategy.map(item._id) : true,
      troupe: troupeStrategy ? troupeStrategy.map(item.toTroupeId) : undefined,
      readBy: item.readBy ? item.readBy.length : undefined,
      urls: item.urls || [],
      mentions: item.mentions || [],
      issues: item.issues || [],
      meta: item.meta || {},
      skipAlerts: item.skipAlerts,
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

  var troupeIdStrategy = new TroupeIdStrategy(options);
  var userIdStrategy = new UserIdStrategy(options);
  var user2IdStrategy = new UserIdStrategy(options);

  this.preload = function(invites, callback) {
    execPreloads([
      {
        strategy: troupeIdStrategy,
        data: invites.map(function(invite) { return invite.troupeId; }).filter(predicates.notNull)
      },

      {
        strategy: user2IdStrategy,
        data: invites.filter(function(invite) { return !!invite.userId; }).map(function(invite) { return invite.userId; }).filter(predicates.notNull)
      },{
        strategy: userIdStrategy,
        data: invites.map(function(invite) { return invite.fromUserId; }).filter(predicates.notNull)
      }
    ], callback);

  };

  this.map = function(item) {
    var troupe = item.troupeId && troupeIdStrategy.map(item.troupeId);
    var fromUser = item.fromUserId && userIdStrategy.map(item.fromUserId); // In future, all invites will have a fromUserId
    var user = item.userId && user2IdStrategy.map(item.userId);

    if(!troupe && !fromUser) {
      return; // This invite is broken.... Data maintenance to remove
    }

    return {
      id: item._id,
      oneToOneInvite: troupe ? false : true,
      fromUser: fromUser,
      user: user,
      email: item.email,
      acceptUrl: troupe ? '/' + troupe.uri : fromUser.url,
      name: troupe ? troupe.name : fromUser.displayName,
      avatarUrl: troupe ? troupe.avatarUrl : fromUser.avatarUrlSmall,
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
    var repos = _.map(userAdminRepos, function(repo) { return repo.full_name; });

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
      name:     item.full_name,
      private:  item.private,
      room:     room ? troupeStrategy.map(room) : undefined
    };
  };

}


function TroupeStrategy(options) {
  if(!options) options = {};

  var currentUserId = options.currentUserId;


  var unreadItemStategy = currentUserId ? new AllUnreadItemCountStategy(options) : null;
  var lastAccessTimeStategy = currentUserId ? new LastTroupeAccessTimesForUserStrategy(options) : null;
  var favouriteStrategy = currentUserId ? new FavouriteTroupesForUserStrategy(options) : null;

  var userIdStategy = new UserIdStrategy(options);

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
        }
      }


      if(otherUser) {
        troupeName = otherUser.displayName;
        troupeUrl = otherUser.username ? "/" + otherUser.username : "/one-one/" + otherUser.id;
      } else {
        winston.verbose("Troupe " + item.id + " appears to contain bad users", { users: item.toObject().users });
        // This should technically never happen......
        return undefined;
      }
    } else {
        troupeName = item.name;
        troupeUrl = "/" + item.uri;
    }

    // Temporary technique until we add proper avatars for troupe at a later stage
    function getDefaultTroupeAvatar() {
      var initials;
      if(troupeName) {
        initials = troupeName
                          .split(/[^\w]/)
                          .filter(function(f) { return f; })
                          .map(function(s) { return s.charAt(0); })
                          .slice(0,2)
                          .join('')
                          .toUpperCase();
      } else {
        initials = '?';
      }
      // TODO: when we move to production, this needs to be behind a CDN
      //return 'https://avatar-beta.trou.pe/' + item.id + '/' + initials + '.png';
      ///return 'http://localhost:3000/' + item.id + '/' + initials + '.png';
      return 'https://d2pu96xiu5jtty.cloudfront.net/' + item.id + '/' + initials + '.png';

    }

    return {
      id: item.id,
      name: troupeName,
      topic: item.topic,
      uri: item.uri,
      avatarUrl: otherUser && otherUser.avatarUrlSmall || getDefaultTroupeAvatar(),
      oneToOne: item.oneToOne,
      users: options.mapUsers && !item.oneToOne ? item.users.map(function(troupeUser) { return userIdStategy.map(troupeUser.userId); }) : undefined,
      user: otherUser,
      unreadItems: unreadItemStategy ? unreadItemStategy.map(item.id) : undefined,
      lastAccessTime: lastAccessTimeStategy ? lastAccessTimeStategy.map(item.id) : undefined,
      favourite: favouriteStrategy ? favouriteStrategy.map(item.id) : undefined,
      url: troupeUrl,
      githubType: item.githubType,
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

function RequestStrategy(options) {
  if(!options) options = {};

  var userStategy = new UserIdStrategy({includeEmail: true});
  var unreadItemStategy = new UnreadItemStategy({ itemType: 'request' });

  this.preload = function(requests, callback) {
    var userIds =  requests.map(function(item) { return item.userId; });

    var strategies = [{
      strategy: userStategy,
      data: userIds
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

function SuggestedContactUserStatusStrategy(options) {
  var userId = options.userId;

  var statii;

  this.preload = function(contacts, callback) {
    Q.all([
        inviteService.findAllUnusedConnectionInvitesFromUserId(userId),
        troupeService.findAllConnectedUserIdsForUserId(userId)
          .then(function(userIds) {
            // TODO: just return the users email addresses, no need for full objects
            return userService.findByIds(userIds);
          })
      ])
      .spread(function(unusedInvites, users) {
        statii = {};

        unusedInvites.forEach(function(invite) {
          if(invite.userId) {
            statii[invite.userId] = 'invited';
          } else if(invite.email) {
            statii[invite.email] = 'invited';
          }
        });

        users.forEach(function(user) {
          statii[user.id] = 'connected';
          statii[user.email] = 'connected';
          user.emails.forEach(function(email) {
            statii[email] = 'connected';
          });
        });

      })
      .nodeify(callback);
  };

  this.map = function(item) {
    var s;
    if(item.contactUserId) {
      s = statii[item.contactUserId];
      if(s) return s;
    }

    for(var i = 0; i < item.emails.length; i++) {
      s = statii[item.emails[i]];
      if(s) return s;
    }
  };
}

function SuggestedContactTroupeStatusStrategy(options) {
  var troupeId = options.troupeId;

  var statii;

  this.preload = function(contacts, callback) {
    Q.all([
        inviteService.findAllUnusedInvitesForTroupe(troupeId),
        troupeService.findAllUserIdsForTroupe(troupeId)
          .then(function(userIds) {
            // TODO: just return the users email addresses, no need for full objects
            return userService.findByIds(userIds);
          })
      ])
      .spread(function(unusedInvites, users) {
        statii = {};

        unusedInvites.forEach(function(invite) {
          if(invite.userId) {
            statii[invite.userId] = 'invited';
          } else if(invite.email) {
            statii[invite.email] = 'invited';
          }
        });

        users.forEach(function(user) {
          statii[user.id] = 'member';
          statii[user.email] = 'member';
          user.emails.forEach(function(email) {
            statii[email] = 'member';
          });
        });

      })
      .nodeify(callback);
  };

  this.map = function(item) {
    var s;
    if(item.contactUserId) {
      s = statii[item.contactUserId];
      if(s) return s;
    }

    for(var i = 0; i < item.emails.length; i++) {
      s = statii[item.emails[i]];
      if(s) return s;
    }
  };
}


function SuggestedContactStrategy(options) {
  var userIdStategy = new UserIdStrategy(options);
  var statusStrategy;

  if(options.statusToUserId) {
    statusStrategy = new SuggestedContactUserStatusStrategy({ userId: options.statusToUserId });
  } else if(options.statusToTroupeId) {
    statusStrategy = new SuggestedContactTroupeStatusStrategy({ troupeId: options.statusToTroupeId });
  }

  this.preload = function(suggestedContacts, callback) {
    var userIds = suggestedContacts
                    .map(function(sc) { return sc.contactUserId; })
                    .filter(function(i) { return !!i; });

    var strategies = [{
      strategy: userIdStategy,
      data: userIds
    }];

    if(statusStrategy) {
      strategies.push({
        strategy: statusStrategy,
        data: suggestedContacts
      });
    }



    execPreloads(strategies, callback);
  };

  this.map = function(item) {
    var user;
    if(item.contactUserId) {
      user = userIdStategy.map(item.contactUserId);
    }

    var firstKnownEmail = item.knownEmails[0];
    return {
      id: item.id,
      status: statusStrategy && statusStrategy.map(item),
      userId: user && user.id,
      displayName: user && user.displayName || item.name,
      avatarUrl: user && user.avatarUrlSmall || firstKnownEmail && gravatar.gravatarUrlForEmail(firstKnownEmail),
      username: user && user.username,
      emails: item.knownEmails
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

function serializeQ(items, strat) {
  var d = Q.defer();
  serialize(items, strat, d.makeNodeResolver());
  return d.promise;
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
  SuggestedContactStrategy: SuggestedContactStrategy,
  getStrategy: getStrategy,
  execPreloads: execPreloads,
  serialize: serialize,
  serializeQ: serializeQ,
  serializeModel: serializeModel,
  GitHubOrgStrategy: GitHubOrgStrategy,
  GitHubRepoStrategy: GitHubRepoStrategy
};
