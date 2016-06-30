'use strict';

var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');

function userLoader(userId, user) {
  var userPromise;

  if (userId) {
    userPromise = user && Promise.resolve(user);
  } else {
    // No userId, so user is always null
    userPromise = Promise.resolve(null);
  }

  return function() {
    if (userPromise) return userPromise;

    userPromise = persistence.User.findById(userId, null, { lean: true })
      .exec();

    return userPromise;
  }
}

module.exports = userLoader;
