"use strict";

/* TODO: distribute this */

var EventEmitter2 = require('eventemitter2').EventEmitter2;
var server = new EventEmitter2({
  wildcard: true, // should the event emitter use wildcards.
  delimiter: '::', // the delimiter used to segment namespaces, defaults to `.`.
  maxListeners: 20, // the max number of listeners that can be assigned to an event, defaults to 10.
});

module.exports = {
  troupeChat: function(troupeId, chatMessage) {
    server.emit('chat', troupeId, chatMessage);
  },
  
  onTroupeChat: function(callback) {
    server.on('chat', callback);
  }
};
