/* jshint maxcomplexity:18 */
"use strict";

var Promise = require('bluebird');

var ALLOWED_SECURITY_VALUES = {
  PRIVATE: 1,
  PUBLIC: 1,
  INHERITED: 1
};

/**
 * COMMON_ORG_REPO_CHANNEL permissions model
 *
 * Commom code for `org-channel-permissions-model` and `repo-channel-permissions-model`
 *
 * `userIsInRoom` MUST BE required from the original module,
 * otherwise the tests will fail because `proxyquire` will not apply its replacements
 */
module.exports = function(delegatePermissionsModel, userIsInRoom) {

  return Promise.method(function commonChannelPermissionsModel(user, right, uri, security) {
    if(!ALLOWED_SECURITY_VALUES.hasOwnProperty(security)) {
      throw new Error('Unknown security: ' + security);
    }

    // Anyone can view a public ORG or REPO channel
    if(right === 'view' && security === 'PUBLIC') {
      return true;
    }

    // No unauthenticated past this point
    if(!user) return false;

    var uriParts = uri.split('/');
    var uriLastPart = uriParts.slice(0, -1).join('/');


    switch(right) {
      case 'join':
      case 'view':
        switch(security) {
          case 'PUBLIC': return true;
          case 'PRIVATE':
            return userIsInRoom(uri, user)
              .then(function(inRoom) {
                if (!inRoom) return false;
                return true;
              });


          case 'INHERITED':
            return delegatePermissionsModel(user, right, uriLastPart);
          default:
            throw new Error('Unknown security: ' + security);
        }
        /* break; */

      case 'adduser':
        switch(security) {
          case 'PUBLIC':
            return true;

          case 'PRIVATE':
            return Promise.all([
                      userIsInRoom(uri, user),
                      delegatePermissionsModel(user, right, uriLastPart)
                    ])
                    .spread(function(inRoom, perm) {
                      return inRoom && perm;
                    });

          case 'INHERITED':
            return delegatePermissionsModel(user, right, uriLastPart);
          default:
            throw new Error('Unknown security: ' + security);
        }
        /* break; */

      case 'create':
        /* Anyone who can CREATE an ORG or REPO can create a child channel */
        var delegatePermissionPromise = delegatePermissionsModel(user, 'create', uriLastPart);

        switch(security) {
          case 'PUBLIC':
            return delegatePermissionPromise;

          case 'PRIVATE':
          case 'INHERITED':
            return delegatePermissionPromise
              .then(function(access) {
                if(!access) return false;

                return true;
              });
          default:
            throw new Error('Unknown security: ' + security);
        }
        /* break; */

      case 'admin':
        /* Anyone who can join an ORG or REPO can create a child channel */
        return delegatePermissionsModel(user, 'admin', uriLastPart);

      default:
        throw new Error('Unknown right: ' + right);
    }
  });
};
