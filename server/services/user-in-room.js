"use strict";

var persistence = require('gitter-web-persistence');

function userIsInRoom(uri, user) {
  var lcUri = uri.toLowerCase();
  return persistence.Troupe.findOne({ lcUri: lcUri }, '_id', { lean: true })
    .exec()
    .then(function(troupe) {
      if(!troupe) return;

      return persistence.TroupeUser.count({ troupeId: troupe._id, userId: user._id })
        .exec()
        .then(function(count) {
          return count > 0;
        });
    });
}

module.exports = userIsInRoom;
