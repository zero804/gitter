/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q               = require('q');
var env             = require('../../utils/env');
var logger          = env.logger;
var userHasSignedUp = require('../user-has-signed-up');
var StatusError     = require('statuserror');

function ensureUserHasSignedUp(uri) {
  return userHasSignedUp(uri)
    .then(function(signedUp) {
      if(signedUp) return true;

      var err = new StatusError(404, 'User not signed up');
      err.uri = uri;
      err.userNotSignedUp = true;
      throw err;
    })
};

/**
 * ONE-TO-ONE permissions model
 */
module.exports = function oneToOnePermissionsModel(user, right, uri, security) {
  // Security is only for child rooms
  if(security) {
    return Q.reject(new Error('oneToOnes do not have security'));
  }

  // For now, only authenticated users can be in onetoones
  if(!user) return Q.resolve(false);

  switch(right) {
    case 'create':
    case 'view':
    case 'join':
      return ensureUserHasSignedUp(uri);

    case 'adduser':
    case 'admin':
      return Q.resolve(false);

    default:
      throw 'Unknown right ' + right;
  }

};
