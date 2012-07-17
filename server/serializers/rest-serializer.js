/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var userService = require("../services/user-service");
var Q = require("q");
var _ = require("underscore");
var handlebars = require('handlebars');
var winston = require("../utils/winston");

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
        winston.debug("Preloads succeeded");
        callback();
      })
      .fail(function(err) {
        winston.error("Preloads failed", err);
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
      self.users = users.indexById();
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
      avatarUrl: getAvatarUrl()
    };
  };
}

function EmailStrategy() {
  var userStategy = new UserIdStrategy();

  this.preload = function(items, callback) {
    var allUsers = items.map(function(i) { return i.fromUserId; });

    execPreloads([{
      strategy: userStategy,
      data: allUsers.distinct()
    }], callback);

  };

  this.map = function(item) {
    return {
      id: item.id,
      from: userStategy.map(item.fromUserId),
      subject: item.subject,
      date: item.date,
      preview: item.preview,
      mail: item.mail
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
      data: lastUsers.distinct()
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
      data: users.distinct()
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

    function narrowFileVersion(item) {
      return {
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
  ConversationStrategy: ConversationStrategy,
  ConversationMinStrategy: ConversationMinStrategy,
  getStrategy: getStrategy,
  serialize: serialize
}