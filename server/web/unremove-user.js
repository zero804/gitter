"use strict";

var Promise = require('bluebird');

// This removes the state of the user when its value is 'REMOVED'.
// This is typically called when the user just logged in, and is useful after
// the user deleted his/her account.
module.exports = function unremoveUser(user) {
  if (user.state === 'REMOVED') {
    user.state = undefined;

    // Persist the state
    return user.save();
  }
  else {
    return Promise.resolve(user);
  }
}
