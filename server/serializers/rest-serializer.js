/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var userService = require("../services/user-service");
var fileService = require("../services/file-service");
var Q = require("q");
var _ = require("underscore");
var handlebars = require('handlebars');
var winston = require("../utils/winston");
var collections = require("../utils/collections");

var predicates = collections.predicates;

function concatArraysOfArrays(a) {
  var result = [];
  for(var i = 0; i < a.length; i++) {
    result = result.concat(a[i]);
  }
  return result;
}

function execPreloads(preloads, callback) {
  var promises = preloads.map(function(i) {
    var deferred = Q.defer();
    i.strategy.preload(i.data, deferred.node());
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

function UserIdStrategy() {
  var self = this;

  this.preload = function(ids, callback) {
    winston.debug("Preloading users: ", ids);

    userService.findByIds(_.uniq(ids), function(err, users) {
      if(err) {
        winston.error("Error loading users", err);
        return callback(err);
      }
      self.users = collections.indexById(users);
      callback(null, true);
    });
  };

  this.map = function(id) {
    var user = self.users[id];
    if(!user) return null;

    function getAvatarUrl() {
      if(user.avatarUrlSmall) {
        return user.avatarUrlSmall;
      }

      return "/avatar/" + user.id;
    }

    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: getAvatarUrl()
    };
  };
}

function FileStrategy() {
  var userStategy = new UserIdStrategy();

  this.preload = function(items, callback) {
    var users = items.map(function(i) { return i.versions.map(function(j) { return j.creatorUserId; }); });
    users = _.flatten(users, true);
    users = _.uniq(users);


    execPreloads([{
      strategy: userStategy,
      data: users
    }], callback);
  };


  this.map = function(item) {
    var versionIndex = 1;
    function narrowFileVersion(item) {
      return {
        versionNumber: versionIndex++,
        creatorUser: userStategy.map(item.creatorUserId),
        createdDate: item.createdDate,
        source: item.source,
        deleted: item.deleted
      };
    }

    return {
      id: item._id,
      fileName: item.fileName,
      mimeType: item.mimeType,
      versions: item.versions.map(narrowFileVersion),
      url: '/troupes/' + encodeURIComponent(item.troupeId) + '/downloads/' + encodeURIComponent(item.fileName),
      previewMimeType: item.previewMimeType,
      embeddedViewType: item.embeddedViewType,
      embeddedUrl: '/troupes/' + encodeURIComponent(item.troupeId) + '/embedded/' + encodeURIComponent(item.fileName)
    };
  };

}

function FileIdStrategy(options) {
  var fileStrategy = new FileStrategy();
  var self = this;

  this.preload = function(ids, callback) {
    fileService.findByIds(ids, function(err, files) {
      if(err) {
        winston.error("Error loading files", err);
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
      winston.warn("Unable to locate fileId ", fileId);
      return null;
    }

    return fileStrategy.map(file);
  };

}

function FileIdAndVersionStrategy() {
  var fileIdStrategy = new FileIdStrategy();
  var self = this;

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
      winston.warn("Unable to locate file ", fileAndVersion.fileId);
      return null;
    }

    var fileVersion = file.versions[fileAndVersion.version - 1];
    if(!fileVersion) {
      winston.warn("Unable to locate fileVersion ", fileAndVersion.version);
      return null;
    }

    // TODO: there is a slight performance gain to be made by not loading all the file versions
    // and only loading the file version (and users) for the needed version

    var versions = file['versions'];
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
      date: item.date,
      preview: item.preview,
      mail: item.mail,
      attachments: _.map(item.attachments, fileStrategy.map)
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
      updated: item.updated,
      subject: item.subject,
      emails: item.emails.map(emailStrategy.map)
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
      updated: item.updated,
      subject: item.subject,
      emailCount: item.emails.length,
      preview: preview,
      lastSender: lastSender,
      hasAttachments: hasAttachments
    };
  };
}

function ChatStrategy()  {
  var userStategy = new UserIdStrategy();

  this.preload = function(items, callback) {
    var users = items.map(function(i) { return i.fromUserId; });

    execPreloads([{
      strategy: userStategy,
      data: _.uniq(users)
    }], callback);
  };

  this.map = function(item) {
    return {
      id: item._id,
      text: item.text,
      sent: item.sent,
      fromUser: userStategy.map(item.fromUserId)
    };
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

    if(!textTemplate || !linkTemplate) { winston.warn("Unknown notification ", item.notificationName); return null; }

    return {
      id: item.id,
      troupeId: item.troupeId,
      createdDate: item.createdDate,
      notificationText: textTemplate(templateData),
      notificationLink: linkTemplate(templateData)
    };
  };
}

/* This method should move */
function serialize(items, Strategy, callback) {
  if(!items) return null;

  var single = !Array.isArray(items);
  if(single) {
    items = [ items ];
  }

  function pkg(i) {
    return single ? i[0] : i;
  }

  var strat = new Strategy();

  strat.preload(items, function(err) {
    if(err) {
      winston.error("Error during preload", err);
      return callback(err);
    }

    winston.debug("Mapping items");
    callback(null, pkg(items.map(strat.map)));
  });

}

function getStrategy(modelName, toCollection) {
  switch(modelName) {
    case 'conversation':
      return toCollection ? ConversationMinStrategy : ConversationStrategy;
    case 'file':
      return FileStrategy;
    case 'notification':
      return NotificationStrategy;
    case 'chat':
      return ChatStrategy;
  }
}

module.exports = {
  UserIdStrategy: UserIdStrategy,
  ConversationStrategy: ConversationStrategy,
  ConversationMinStrategy: ConversationMinStrategy,
  NotificationStrategy: NotificationStrategy,
  FileStrategy: FileStrategy,
  ChatStrategy: ChatStrategy,
  getStrategy: getStrategy,
  serialize: serialize
}