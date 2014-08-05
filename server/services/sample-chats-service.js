/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var appEvents     = require('../app-events');
var troupeService = require('./troupe-service');
//var bayeux        = require('../web/bayeux');

var sampleChats = [];
//var c = 0;
var samplesChannel = '/sample-chats';
//var bayeuxClient = bayeux.client;

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
          //c++;

          sampleChats.push(sample);
          if (sampleChats.length > 30) sampleChats.shift();

          //if (c === 10) {
          //  bayeuxClient.publish(samplesChannel, sample);
          //  c = 0;
          //}
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
