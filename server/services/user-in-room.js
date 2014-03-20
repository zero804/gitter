/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('./persistence-service');

function userIsInRoom(uri, user) {
  var lcUri = uri.toLowerCase();
  return persistence.Troupe.findOneQ({ lcUri: lcUri }, 'users.userId', { lean: true })
    .then(function(troupe) {
      if(!troupe) return;

      var inRoom = troupe.users.some(function(troupeUser) {
        return "" + troupeUser.userId === "" + user._id;
      });

      return inRoom;

    });
}

module.exports = userIsInRoom;