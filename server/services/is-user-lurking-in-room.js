/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('./persistence-service');

function isUserLurkingInRoom(userId, troupeId) {
  return persistence.Troupe.findOneQ({ _id:  troupeId, 'users.userId':  userId }, { 'users.$': 1 } )
    .then(function(troupe) {
      if(!troupe) return; // Not in room....

      // Select clause means that the user will
      // always be the only one returned
      return !!troupe.users[0].lurk;
    });
}

module.exports = isUserLurkingInRoom;
