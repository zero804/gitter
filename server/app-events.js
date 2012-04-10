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
  troupeChat: function(troupeId, chatMessage) {
    hook.emit('chat', { troupeId: troupeId, chatMessage: chatMessage });
  },

  onTroupeChat: function(callback) {
    winston.info("Subscribing to chat messages");
    hook.on('chat', function(data) {
      winston.debug("Incoming chat message");
      callback(data);
    });
  }
};
