"use strict";

var persistence = require('gitter-web-persistence');

function userIsBannedFromRoom(uri, user) {
  var lcUri = uri.toLowerCase();
  return persistence.Troupe.findOne({ lcUri: lcUri }, 'bans.userId', { lean: true })
    .exec()
    .then(function(troupe) {
      if(!troupe) return false;
      if(!troupe.bans) return false;

      var isBannedFromRoom = troupe.bans.some(function(troupeBan) {
        return "" + troupeBan.userId === "" + user.id;
      });

      return isBannedFromRoom;

    });
}

module.exports = userIsBannedFromRoom;
