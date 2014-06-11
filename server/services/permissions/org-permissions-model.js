/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GitHubOrgService     = require('../github/github-org-service');
var Q                    = require('q');

/**
 * ORG permissions model
 */
module.exports = function orgPermissionsModel(user, right, uri, security) {
  // Security is only for child rooms
  if(security) {
    return Q.reject(new Error('orgs do not have security'));
  }

  // For now, only authenticated users can be members of orgs
  if(!user) return Q.resolve(false);

  var ghOrg = new GitHubOrgService(user);
  return ghOrg.member(uri, user.username)
    .then(function(isMember) {
      // If the user isn't part of the org, always refuse
      // them permission
      if(!isMember) {
        return false;
      }

      switch(right) {
        case 'view':
        case 'create':
        case 'admin':
        case 'join':
        case 'adduser':
          /* Org members can do anything */
          return true;

        default:
          throw 'Unknown right ' + right;
      }

    });
};
