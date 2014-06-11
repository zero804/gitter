/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');

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
    case 'view':
    case 'create':
    case 'join':
      return Q.resolve(true);

    case 'adduser':
    case 'admin':
      return Q.resolve(false);

    default:
      throw 'Unknown right ' + right;
  }

};
