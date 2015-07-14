"use strict";

var _ = require("underscore");

/* In a one-to-one troupe, return the OTHER user given a known user */
function getOtherOneToOneUserId(troupe, knownUserId) {
  knownUserId = knownUserId  ? "" + knownUserId : null;
  var troupeUser = _.find(troupe.users, function(troupeUser) {
    return "" + troupeUser.userId != knownUserId;
  });

  return troupeUser && troupeUser.userId;
}
exports.getOtherOneToOneUserId = getOtherOneToOneUserId;
