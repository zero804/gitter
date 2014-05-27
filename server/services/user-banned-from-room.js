/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('./persistence-service');

function userIsBannedFromRoom(uri, user) {
  var lcUri = uri.toLowerCase();
  return persistence.Troupe.findOneQ({ lcUri: lcUri }, 'bans.userId', { lean: true })
    .then(function(troupe) {
      if(!troupe) return false;
      if(troupe.bans) return false;

      var isBannedFromRoom = troupe.bans.some(function(troupeBan) {
        return "" + troupeBan.userId === "" + user._id;
      });

      return isBannedFromRoom;

    });
}

module.exports = userIsBannedFromRoom;