/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env                  = require('../../utils/env');
var logger               = env.logger;

var GitHubOrgService     = require('../github/github-org-service');
var userIsInRoom         = require('../user-in-room');
var Q                    = require('q');

/**
 * ORG permissions model
 */
module.exports = function orgPermissionsModel(user, right, uri, security, options) {
  options = options || {};
  // Security is only for child rooms
  if(security) {
    return Q.reject(new Error('orgs do not have security'));
  }

  // For now, only authenticated users can be members of orgs
  if(!user) return Q.resolve(false);

  var ghOrg = new GitHubOrgService(options.githubTokenUser || user);
  return ghOrg.member(uri, user.username)
    .catch(function(err) {
      if(err.errno && err.syscall || err.status >= 500) {
        logger.error('GitHub member call failed: ' + err, { exception: err });
        // GitHub call failed and may be down.
        // We can fall back to whether the user is already in the room
        return userIsInRoom(uri, user);
      }

      throw err;
    })
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
