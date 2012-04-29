/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";

var passport = require('passport'),
    nowjs = require("now"),
    redis = require("redis"),
    winston = require('winston'),
    chatService = require("./services/chat-service"),
    troupeService = require("./services/troupe-service"),
    presenceService = require("./services/presence-service"),
    appEvents = require("./app-events"),
    nconf = require('./utils/config').configure(),
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

          presenceService.userSocketDisconnected(user.id, self.user.clientId);
        });
      });

      everyone.now.subscribeToTroupe = function(troupeId) {
        var self = this;

        loadUserAndTroupe(this.user, troupeId, sessionStore, function(err, user, troupe) {
          winston.info("User subscribed to group chat");

          presenceService.userSubscribedToTroupe(user.id, troupe.id, self.user.clientId);

          var group = nowjs.getGroup("troup." + troupe.id);
          group.addUser(self.user.clientId);
        });
      };

      /* TODO: add unsubscribe from troupe ? (not needed yet: simply reloading the page should close the socket) */

      everyone.now.subscribeToTroupeChat = function(troupeId) {
        var self = this;

        loadUserAndTroupe(this.user, troupeId, sessionStore, function(err, user, troupe) {
          if(err) return;
          winston.info("User subscribed to group chat");

          var group = nowjs.getGroup("troup." + troupe.id + ".chat");
          group.addUser(self.user.clientId);
        });
      };

      everyone.now.unsubscribeToTroupeChat = function(troupeId) {
        winston.info("User unsubscribed from group chat");

        var group = nowjs.getGroup("troup." + troupeId + ".chat");
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
        winston.info("New chat message on bus");
        var troupeId = data.troupeId;

        var group = nowjs.getGroup("troup." + troupeId + ".chat");
        group.now.onTroupeChatMessage(data.chatMessage);
      });

    }

};
