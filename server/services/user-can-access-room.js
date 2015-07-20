/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('./persistence-service');

var env    = require('gitter-web-env');
var logger = env.logger;

function userCanAccessRoom(userId, troupeId, callback) {
  // TODO: use the room permissions model
  return persistence.Troupe.findByIdQ(troupeId, { bans: 1, security: 1 }, { lean: true })
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

      return persistence.TroupeUser.countQ({ troupeId: troupeId, userId: userId })
        .then(function(isInRoom) {
          if(!isInRoom) {
            logger.info("Denied user " + userId + " access to troupe " + troupe.uri);
            return false;
          }

          return true;
        });

    })
    .nodeify(callback);
}

module.exports = userCanAccessRoom;
