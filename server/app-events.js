/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";

var events = require('events');

var winston = require('winston');
var redis = require('redis');
var client = redis.createClient();
var pubClient = redis.createClient();
var eventEmitter = new events.EventEmitter();

var subscriptions = {};

client.on("message", function (channel, message) {
  eventEmitter.emit(channel, JSON.parse(message));
});

function emit(event, data) {
  winston.info("Emit", arguments);
  pubClient.publish(event, JSON.stringify(data));
}

function on(event, callback) {
  if(!subscriptions[event]) {
    client.subscribe(event);

    subscriptions[event] = true;
  }

  eventEmitter.on(event, function(message) {
    winston.info("Event received", message);
    callback(message);
  });
}

module.exports = {
  userLoggedIntoTroupe: function(userId, troupeId) {
    emit('userLoggedIntoTroupe', { troupeId: troupeId, userId: userId });
  },

  onUserLoggedIntoTroupe: function(callback) {
    on('userLoggedIntoTroupe', callback);
  },

  userLoggedOutOfTroupe: function(userId, troupeId) {
    emit('userLoggedOutOfTroupe', { troupeId: troupeId, userId: userId });
  },

  onUserLoggedOutOfTroupe: function(callback) {
    on('userLoggedOutOfTroupe', callback);
  },

  troupeChat: function(troupeId, chatMessage) {
    emit('chat', { troupeId: troupeId, chatMessage: chatMessage });
  },

  onTroupeChat: function(callback) {
    on('chat', callback);
  },

  fileEvent: function(event, troupeId, fileId) {
    emit('file', { event: event, fileId: fileId, troupeId: troupeId });
  },

  onFileEvent: function(callback) {
    on('file', callback);
  }

};
