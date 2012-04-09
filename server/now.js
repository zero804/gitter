/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";

var passport = require('passport'),
    nowjs = require("now"),
    redis = require("redis"),
    winston = require('winston'),
    chatService = require("./services/chat-service"),
    troupeService = require("./services/troupe-service"),
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
    if(!session.passport.user) return callback(null, null);

    passport.deserializeUser(session.passport.user, callback);
  });
}

module.exports = {
    install: function(app, sessionStore) {
      everyone = nowjs.initialize(app, {
         "host" : nconf.get("ws:hostname"),
         "port" : nconf.get("ws:port")
      });

      /* TODO: shutdown client at end of session */
      redisClient = redis.createClient();

      nowjs.on('connect', function() {
        var self = this;
        loadSessionWithUser(this.user, sessionStore, function(err, user) {
          if(err) return;
          if(!user) return;

          winston.info("User connected to now");

          redisClient.rpush("socket." + user.id, self.user.clientId, redisClient.print);
        });
      });

      nowjs.on('disconnect', function() {
        var self = this;

        loadSessionWithUser(this.user, sessionStore, function(err, user) {
          if(err) return;
          if(!user) return;

          winston.info("User disconnected from now");

          redisClient.lrem("socket." + user.id, 0, self.user.clientId, redisClient.print);
        });
      });

      everyone.now.subscribeToTroupeChat = function(troupeId) {
        var self = this;

        loadSessionWithUser(this.user, sessionStore, function(err, user) {
          if(err) return;
          if(!user) return;

          troupeService.findById(troupeId, function(err, troupe) {
            if(err) return;
            if(!troupe) return;

            if(!troupeService.userHasAccessToTroupe(user, troupe)) return;

            winston.info("User subscribed to group chat");

            var group = nowjs.getGroup("troup." + troupe.id);
            group.addUser(self.user.clientId);
          });
        });
      };

      everyone.now.unsubscribeToTroupeChat = function(troupeId) {
        winston.info("User unsubscribed from group chat");

        var group = nowjs.getGroup("troup." + troupeId);
        group.removeUser(this.user.clientId);
      };

      everyone.now.newChatMessageToTroupe = function(options) {
        loadSessionWithUser(this.user, sessionStore, function(err, user) {
          if(err) return;
          if(!user) return;

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

      appEvents.onTroupeChat(function(troupeId, message) {
        var group = nowjs.getGroup("troup." + troupeId);
        group.now.onTroupeChatMessage(message);
      });

    }

};
