/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";

var passport = require('passport'),
    nowjs = require("now"),
    redis = require("redis"),
    winston = require('winston'),
    persistence = require("./services/persistence-service"),
    chatService = require("./services/chat-service"),
    userService = require("./services/user-service"),
    troupeService = require("./services/troupe-service"),
    presenceService = require("./services/presence-service"),
    conversationService = require("./services/conversation-service"),
    fileService = require("./services/file-service"),
    restSerializer = require("./serializers/rest-serializer"),
    appEvents = require("./app-events"),
    nconf = require('./utils/config').configure(),
    Q = require("q"),
    everyone,
    redisClient;

/* Theoretically this should be done by express middleware, but it seems have some bugs right now */
function loadSession(user, sessionStore, callback) {
  var sid = decodeURIComponent(user.cookie['connect.sid']);
  sessionStore.get(sid, callback);
}

/* Theoretically this should be done by express middleware, but it seems have some bugs right now */
function loadSessionWithUser(user, sessionStore, callback) {
  loadSession(user, sessionStore, function(err, session) {
    if(err) return callback(err);
    if(!session) return callback("No session for user");
    if(!session.passport.user) return callback(null, null);

    passport.deserializeUser(session.passport.user, callback);
  });
}

function loadUserAndTroupe(nowJsUser, troupeId, sessionStore, callback) {
  loadSessionWithUser(nowJsUser, sessionStore, function(err, user) {
    if(err) return callback(err);
    if(!user) return callback("User not found");

    troupeService.findById(troupeId, function(err, troupe) {
      if(err) return callback(err);
      if(!troupe) return callback("Troupe not found");

      if(!troupeService.userHasAccessToTroupe(user, troupe)) return callback("Access denied");

      callback(err, user, troupe);
    });
  });
}

/**
 * Fetch a now.js group by name and call the callback if the group has users
 */
function getGroup(groupName, callback) {
  var group = nowjs.getGroup(groupName);

  group.count(function (count) {
    if(!count) { return; }
    callback(group);
  });
}

module.exports = {
    install: function(app, sessionStore) {
      everyone = nowjs.initialize(app, {
         "host" : nconf.get("ws:hostname"),
         "port" : nconf.get("ws:externalPort")
      });

      nowjs.on('connect', function() {
        var self = this;
        loadSessionWithUser(this.user, sessionStore, function(err, user) {
          if(err) return;
          if(!user) return;

          presenceService.userSocketConnected(user.id, self.user.clientId);
        });
      });

      nowjs.on('disconnect', function() {
        var self = this;

        loadSessionWithUser(this.user, sessionStore, function(err, user) {
          if(err) return;
          if(!user) return;

          /* Give the user 10 seconds to log back into before reporting that they're disconnected */
          setTimeout(function(){
            presenceService.userSocketDisconnected(user.id, self.user.clientId);
          }, 10000);

        });
      });

      everyone.now.subscribeToTroupe = function(troupeId, callback) {
        var self = this;
        if(!callback) callback = function() {};

        loadUserAndTroupe(this.user, troupeId, sessionStore, function(err, user, troupe) {
          if(err) {
            winston.warn('Error while loading user and troupe in subscribeToTroupe: ' + err);
            callback({ description: "Server error", reauthenticate: true });
            return;
          }

          if(!user || !troupe) {
            callback({ description: "Authentication failure", reauthenticate: true });
            return;
          }

          presenceService.userSubscribedToTroupe(user.id, troupe.id, self.user.clientId);

          var group = nowjs.getGroup("troupe." + troupe.id);
          group.addUser(self.user.clientId);

          callback(null);
        });
      };

      everyone.now.newChatMessageToTroupe = function(options) {
        winston.info("User sent new message to troupe: " + options.text);

        loadSessionWithUser(this.user, sessionStore, function(err, user) {
          if(err || !user) {
            winston.info("Rejecting chat message to troupe: " + JSON.stringify(err) + "," + user);
            return;
          }

          winston.info("User sent new message to troupe: " + options.text);

          /*
           * TODO: check security that this user can send messages to this troupe. This should probably
           * happen in the message service
           */
          chatService.newChatMessageToTroupe(options.troupeId, user, options.text, function(err, chatMessage) {
            if(err) {
              winston.warn("Failed to persist new chat message: " + err);
            }
          });

        });
      };

      appEvents.onTroupeChat(function(data) {
        var troupeId = data.troupeId;
        var group = getGroup("troupe." + troupeId, function (group) {
          group.now.onTroupeChatMessage(data.chatMessage);
        });
      });

      appEvents.onUserLoggedIntoTroupe(function(data) {
        var troupeId = data.troupeId;
        var userId = data.userId;

        getGroup("troupe." + troupeId, function(group) {
          var deferredT = Q.defer();
          var deferredU = Q.defer();

          userService.findById(userId, deferredU.node());
          troupeService.findById(troupeId, deferredT.node());

          Q.all([deferredT.promise, deferredU.promise]).spread(function(troupe, user) {
            group.now.onUserLoggedIntoTroupe({
              userId: userId,
              displayName: user.displayName
            });
          });
        });

      });

      appEvents.onUserLoggedOutOfTroupe(function(data) {
        var troupeId = data.troupeId;
        var userId = data.userId;

        getGroup("troupe." + troupeId, function(group) {
          var deferredT = Q.defer();
          var deferredU = Q.defer();

          userService.findById(userId, deferredU.node());
          troupeService.findById(troupeId, deferredT.node());

          Q.all([deferredT.promise, deferredU.promise]).spread(function(troupe, user) {
            group.now.onUserLoggedOutOfTroupe({
              userId: userId,
              displayName: user.displayName
            });
          });

        });
      });

      appEvents.onFileEvent(function(data) {
        winston.debug("onFileEvent -> now.js ", data);
        var event = data.event;
        switch(event) {
          case 'createVersion':
          case 'createThumbnail':
          break;
        default:
          return;
        }

        var fileId = data.fileId;
        var troupeId = data.troupeId;

        getGroup("troupe." + troupeId, function(group) {
          fileService.findById(fileId, function(err, file) {
            winston.info("Bridging file event to now.js clients");

            group.now.onFileEvent({
              event: event,
              file: persistence.narrowFile(file)
            });
          });

        });
      });


      appEvents.onMailEvent(function(data) {
        winston.debug("onMailEvent -> now.js ", data);
        var event = data.event;
        if(event !== 'new') {
          /* Filter..... */
          return;
        }

        var troupeId = data.troupeId;
        var conversationId = data.conversationId;
        var mailIndex = data.mailIndex;



        getGroup("troupe." + troupeId, function(group) {
          conversationService.findById(conversationId, function(err, conversation) {
            if(err || !conversation) return winston.error("Notification failure", err);

            restSerializer.serialize(conversation, restSerializer.ConversationMinStrategy, function(err, serializedConversation) {
              if(err || !serializedConversation) return winston.error("Notification failure", err);

              group.now.onMailEvent({
                event: event,
                conversation: serializedConversation,
                mailIndex: mailIndex
              });
            });
          });

        });
      });

      appEvents.onNewNotification(function(data) {
        var troupeId = data.troupeId;
        var userId = data.userId;
        var notificationText = data.notificationText;
        var notificationLink = data.notificationLink;

        /* Directed at a troupe? */
        if(troupeId) {
          getGroup("troupe." + troupeId, function(group) {
            group.now.onNotification({
              troupeId: troupeId,
              notificationText: notificationText,
              notificationLink: notificationLink
            });
          });
        }

        /* Directed at a user? */
        if(userId) {
          winston.error("DIRECT USER NOTIFICATIONS NOT YET IMPLEMENTED!!");
          // TODO
        }
      });

      appEvents.onDataChange(function(data) {
        console.log("nowjs: onDataChange", data);

        var troupeId = data.troupeId;
        var modelId = data.modelId;
        var modelName = data.modelName;
        var operation = data.operation;
        var model = data.model;

        getGroup("troupe." + troupeId, function(group) {
          if(operation === 'save') {
            console.log("Preparing model ", model);

            var strategy = restSerializer.getStrategy(modelName, true);
            restSerializer.serialize(model, strategy, function(err, serializedModel) {
              if(err || !serializedModel) return winston.error("Serialization failure failure", err);
              console.log("onDataChange", serializedModel);
              group.now.onDataChange({
                troupeId: troupeId,
                modelName: modelName,
                operation: operation,
                id: modelId,
                model: serializedModel
              });
            });
          } else {
            group.now.onDataChange({
              troupeId: troupeId,
              modelName: modelName,
              operation: operation,
              id: modelId
            });
          }
        });

      });

    }

};
