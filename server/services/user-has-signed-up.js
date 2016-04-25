"use strict";

var persistence = require('gitter-web-persistence');

function userHasSignedUp(username) {
  // TODO: add case insensitve matching for usernames!
  return persistence.User.findOne({ username: new RegExp("^" + username + "$", "i") }, 'state', { lean: true })
    .exec()
    .then(function(user) {
      if(!user) return false;
      // A user only has state if they're not ACTIVE
      if(user.state) return false;

      return true;
    });
}

module.exports = userHasSignedUp;
