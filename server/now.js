/*global console:false, require: true, module: true, process: false */
"use strict";

var passport = require('passport'),
    nowjs = require("now"),
    redis = require("redis"),
    winston = require('winston'),
    chatService = require("./services/chat-service"),
    userService = require("./services/user-service"),
    troupeService = require("./services/troupe-service"),
    presenceService = require("./services/presence-service"),
    fileService = require("./services/file-service"),
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

      /* TODO: add unsubscribe from troupe ? (not needed yet: simply reloading the page should close the socket) */

      everyone.now.subscribeToTroupeChat = function(troupeId) {
        var self = this;

        loadUserAndTroupe(this.user, troupeId, sessionStore, function(err, user, troupe) {
          if(err) return;

          var group = nowjs.getGroup("troupe." + troupe.id + ".chat");
          group.addUser(self.user.clientId);
        });
      };

      everyone.now.unsubscribeToTroupeChat = function(troupeId) {
        winston.info("User unsubscribed from group chat");

        var group = nowjs.getGroup("troupe." + troupeId + ".chat");
        group.removeUser(this.user.clientId);
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
        var group = nowjs.getGroup("troupe." + troupeId + ".chat");

        winston.info("New chat message on bus");
        group.count(function (count) {
          if(!count) { winston.info("Count==" + count); return; }

          group.now.onTroupeChatMessage(data.chatMessage);
        });
      });

      appEvents.onUserLoggedIntoTroupe(function(data) {
        var troupeId = data.troupeId;
        var userId = data.userId;

        var group = nowjs.getGroup("troupe." + troupeId);
        group.count(function (count) {
          if(!count) { winston.info("Count==" + count); return; }

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

        var group = nowjs.getGroup("troupe." + troupeId);
        group.count(function (count) {
          if(!count) { winston.info("Count==" + count); return; }

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
        var event = data.event;
        var fileId = data.fileId;
        var troupeId = data.troupeId;

        var group = nowjs.getGroup("troupe." + troupeId);
        group.count(function (count) {
          if(!count) { winston.info("Count==" + count); return; }

          fileService.findById(fileId, function(err, file) {
            winston.info("Bridging file event to now.js clients");

            group.now.onFileEvent({
              event: event,
              file: file.narrow()
            });
          });
        });
      });
    }

};
