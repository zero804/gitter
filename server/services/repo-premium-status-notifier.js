/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeDao   = require('./daos/troupe-dao').lean;
var appEvents   = require('gitter-web-appevents');
var userService = require('./user-service');
var roomMembershipService = require('./room-membership-service')

function repoPremiumStatusNotifier(userOrOrg, premiumStatus) {
  return userService.findByUsername(userOrOrg)
    .then(function(user) {
      var isOrg = !user;

      if(!isOrg) {
        // For a user
        appEvents.dataChange2("/user/" + user._id, 'patch', {
          id: "" + user._id,
          premium: premiumStatus
        });
      }

      return troupeDao.findByOwnerUri(userOrOrg, { '_id': 1 })
        .then(function(troupes) {
          var troupeIds = troupes.map(function(troupe) { return troupe._id; });
          return roomMembershipService.findMembersForRoomMulti(troupeIds);
        })
        .then(function(troupeUsersHash) {
          var userNotificatons = {};

          Object.keys(troupeUsersHash).forEach(function(troupeId) {
            var userIds = troupeUsersHash[troupeId];

            userIds.forEach(function(userId) {

              if(isOrg) {
                // TODO: come up with a better mapping from org to user
                if(!userNotificatons[userId]) {
                  // Only do this once per user
                  userNotificatons[userId] = true;

                  appEvents.dataChange2("/user/" + userId + "/orgs", 'patch', {
                    name: userOrOrg, // Id for org is the name
                    premium: premiumStatus
                  });
                }
              }

              appEvents.dataChange2("/user/" + userId + "/rooms", 'patch', {
                id: "" + troupeId,
                premium: premiumStatus
              });

            });
          });
        });

    });

}

module.exports = repoPremiumStatusNotifier;
