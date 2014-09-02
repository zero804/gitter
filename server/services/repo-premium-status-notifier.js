/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeDao   = require('./daos/troupe-dao').lean;
var appEvents   = require('../app-events');
var userService = require('./user-service');

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

      var userNotificatons = {};

      return troupeDao.findByOwnerUri(userOrOrg, { 'users.userId': 1 })
        .then(function(troupes) {

          if(!troupes || !troupes.length) return;

          troupes.forEach(function(troupe) {

            troupe.users.forEach(function(user) {

              if(isOrg) {
                // TODO: come up with a better mapping from org to user
                if(!userNotificatons[user.userId]) {
                  // Only do this once per user
                  userNotificatons[user.userId] = true;

                  appEvents.dataChange2("/user/" + user.userId + "/orgs", 'patch', {
                    name: userOrOrg, // Id for org is the name
                    premium: premiumStatus
                  });
                }
              }

              appEvents.dataChange2("/user/" + user.userId + "/rooms", 'patch', {
                id: "" + troupe._id,
                premium: premiumStatus
              });

            });

          });
        });

    });

}

module.exports = repoPremiumStatusNotifier;
