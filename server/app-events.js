/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";

var events = require('events');

var winston = require('winston');
var _ = require('underscore');
var redis = require('redis');
var client = redis.createClient();
var pubClient = redis.createClient();
var eventEmitter = new events.EventEmitter();

var subscriptions = {};

client.on("message", function (channel, message) {
  eventEmitter.emit(channel, JSON.parse(message));
});

function emit(event, data) {
  winston.info("Emit", event);
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

  fileEvent: function(event, options) {
    emit('file', _.extend(options, { event: event }));
  },

  onFileEvent: function(callback) {
    on('file', callback);
  },

  mailEvent: function(event, troupeId, conversationId, mailIndex) {
    emit('mail', {
      event: event,
      troupeId: troupeId, 
      conversationId: conversationId,
      mailIndex: mailIndex
    });
  },

  onMailEvent: function(callback) {
    on('mail', callback);
  },

  newNotification: function(troupeId, userId, notificationText, notificationLink) {
    emit('newNotification', {
      troupeId: troupeId,
      userId: userId,
      notificationText: notificationText,
      notificationLink: notificationLink
    });
  },

  onNewNotification: function(callback) {
    on('newNotification', callback);
  },

  dataChange: function(modelName, operation, modelId, troupeId, model) {
    emit('dataChange', {
      modelName: modelName,
      operation: operation,
      modelId: modelId,
      troupeId: troupeId,
      model: model
    });
  },

  onDataChange: function(callback) {
    on('dataChange', callback);
  }

};
