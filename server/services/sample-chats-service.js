/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var appEvents     = require('../app-events');
var troupeService = require('./troupe-service');

var sampleUsers = [];
var sampleChats = [];

appEvents.localOnly.onChat(function(evt) { 
  if (evt.operation === 'create') {

    troupeService.findById(evt.troupeId)
      .then(function(troupe) {
        var sample = {
          avatarUrl: evt.model.fromUser.avatarUrlSmall,
          username: evt.model.fromUser.username,
          room: troupe.uri
        };

        if (troupe.security === 'PUBLIC') {

          // Display only one message per user
          if (sampleUsers.indexOf(sample.username) === -1) {
            sampleUsers.push(sample.username);
            sampleChats.push(sample);
          }

          // Keep only 30 msgs
          if (sampleChats.length > 30) {
            sampleUsers.shift();
            sampleChats.shift();
          }
        }
      });
  }
});

function getSamples() {
  return sampleChats;
}

module.exports = {
  getSamples: getSamples
};
