/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeDao = require('./daos/troupe-dao').lean;
var appEvents = require('../app-events');

function repoPremiumStatusNotifier(userOrOrg, premiumStatus) {
  return troupeDao.findByOwnerUri(userOrOrg, { 'users.userId': 1 })
    .then(function(troupes) {
      if(!troupes || !troupes.length) return;

      troupes.forEach(function(troupe) {

        troupe.users.forEach(function(user) {

          appEvents.dataChange2("/user/" + user.userId + "/rooms", 'patch', {
            id: "" + troupe._id,
            premium: premiumStatus
          });

          console.log("/user/" + user.userId + "/rooms", 'patch', {
            id: "" + troupe._id,
            premium: premiumStatus
          });

        });

      });
    });
}

module.exports = repoPremiumStatusNotifier;
