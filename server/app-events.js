/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";

var Hook = require('hook.io').Hook;
var winston = require('winston');

var hook = new Hook({
  debug:true,
  "port": 5984,
  ignoreSTDIN: true,
  'hook-port': 9999
});
hook.start();

//hook.start();

module.exports = {
  userLoggedIntoTroupe: function(userId, troupeId) {
    hook.emit('userLoggedIntoTroupe', { troupeId: troupeId, userId: userId });
  },

  onUserLoggedIntoTroupe: function(callback) {
    hook.on('userLoggedIntoTroupe', callback);
  },

  userLoggedOutOfTroupe: function(userId, troupeId) {
    hook.emit('userLoggedOutOfTroupe', { troupeId: troupeId, userId: userId });
  },

  onUserLoggedOutOfTroupe: function(callback) {
    hook.on('userLoggedOutOfTroupe', callback);
  },

  troupeChat: function(troupeId, chatMessage) {
    hook.emit('chat', { troupeId: troupeId, chatMessage: chatMessage });
  },

  onTroupeChat: function(callback) {
    hook.on('chat', callback);
  }
};
