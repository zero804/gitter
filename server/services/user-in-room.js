"use strict";

var persistence = require('./persistence-service');

function userIsInRoom(uri, user) {
  var lcUri = uri.toLowerCase();
  return persistence.Troupe.findOneQ({ lcUri: lcUri }, '_id', { lean: true })
    .then(function(troupe) {
      if(!troupe) return;

      return persistence.TroupeUser.countQ({ troupeId: troupe._id, userId: user._id })
        .then(function(count) {
          return count > 0;
        });
    });
}

module.exports = userIsInRoom;
