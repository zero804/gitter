'use strict';

// @const - higher index in array, higher rank
var RANK = ['contributor', 'admin'];

function compareRank(userA, userB) {
  var aRole = userA.toJSON ? userA.get('role') : userA.role;
  var bRole = userB.toJSON ? userB.get('role') : userB.role;
  return RANK.indexOf(aRole) - RANK.indexOf(bRole) || 0;
}

function compareNames(userA, userB) {
  var aName = userA.toJSON ? userA.get('username') : userA.username;
  var bName = userB.toJSON ? userB.get('username') : userB.username;
  return bName.toLowerCase().localeCompare(aName.toLowerCase());
}

function inviteStatusDiffer(userA, userB) {
  var aInvited = userA.toJSON ? userA.get('invited') : userA.invited;
  var bInvited = userB.toJSON ? userB.get('invited') : userB.invited;
  return aInvited !== bInvited;
}

function compareInvites(userA, userB) {
  var aInvited = userA.toJSON ? userA.get('invited') : userA.invited;
  var bInvited = userB.toJSON ? userB.get('invited') : userB.invited;

  if (aInvited === bInvited) {
    return 0;
  } else if (aInvited && !bInvited) {
    return -1;
  } else {
    return 1;
  }
}

// it is worth noticing that we want to sort in a descindencing order, thus the negative results
module.exports = function (a, b) {
  var rankDifference = compareRank(a, b); // checks if there is rank difference

  // attempts to sort by rank
  if (rankDifference) { return - rankDifference; }

  // attempts to sort by invite status
  if (inviteStatusDiffer(a, b)) { return - compareInvites(a, b); }

  // default sort
  return - compareNames(a, b);
};
