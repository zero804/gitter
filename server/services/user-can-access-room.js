/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('./persistence-service');
var roomPermissionsModel = require('./room-permissions-model');

function userCanAccessRoom(userId, troupeId, callback) {
  return persistence.Troupe.findById(troupeId, { bans: 1, security: 1, githubType: 1, uri: 1 }, { lean: true })
    .exec()
    .then(function(troupe) {
      if(!troupe) return false;

      if(troupe.bans && troupe.bans.some(function(troupeBan) {
        return "" + userId == "" + troupeBan.userId;
      })) {
        // Banned from the room? You get to see nothing dog!
        return false;
      }

      if(troupe.security === 'PUBLIC') {
        return true;
      }

      // After this point, everything needs to be authenticated
      if(!userId) {
        return false;
      }

      return persistence.TroupeUser.count({ troupeId: troupeId, userId: userId })
        .exec()
        .then(function(isInRoom) {
          if(!isInRoom) {
            // TODO: This might be too slow for prod?
            return persistence.User.findById(userId)
            .then(function(user) {
              return roomPermissionsModel(user, 'view', troupe);
            });
          }

          return true;
        });

    })
    .nodeify(callback);
}

module.exports = userCanAccessRoom;
