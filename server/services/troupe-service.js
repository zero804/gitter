/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global require: true, module: true */
"use strict";

var persistence = require("./persistence-service"),
    userService = require("./user-service"),
    emailNotificationService = require("./email-notification-service"),
    uuid = require('node-uuid'),
    winston = require("winston"),
    collections = require("../utils/collections"),
    Fiber = require("../utils/fiber"),
    statsService = require("../services/stats-service");


function findByUri(uri, callback) {
  persistence.Troupe.findOne({uri: uri}, function(err, troupe) {
    callback(err, troupe);
  });
}

function findByIds(ids, callback) {
  persistence.Troupe
    .where('_id').in(ids)
    .exec(callback);
}

function findById(id, callback) {
  persistence.Troupe.findById(id, function(err, troupe) {
    callback(err, troupe);
  });
}

function findMemberEmails(id, callback) {
  findById(id, function(err,troupe) {
    if(err) callback(err);
    if(!troupe) callback("No troupe returned");

    var userIds = troupe.getUserIds();

    userService.findByIds(userIds, function(err, users) {
      if(err) callback(err);
      if(!users) callback("No users returned");

      var emailAddresses = users.map(function(item) { return item.email; } );

      callback(null, emailAddresses);
    });

  });
}

function findAllTroupesForUser(userId, callback) {
  persistence.Troupe
    .where('users.userId', userId)
    .sort({ name: 'asc' })
    .slaveOk()
    .exec(callback);
}

function findAllTroupesIdsForUser(userId, callback) {
  persistence.Troupe
    .where('users.userId', userId)
    .select('id')
    .slaveOk()
    .exec(function(err, result) {
      if(err) return callback(err);

      var troupeIds = result.map(function(troupe) { return troupe.id; } );
      return callback(null, troupeIds);
    });
}

function userHasAccessToTroupe(user, troupe) {
  return troupe.containsUserId(user.id);
}

function userIdHasAccessToTroupe(userId, troupe) {
  return troupe.containsUserId(userId);
}

function validateTroupeEmail(options, callback) {
  var from = options.from;
  var to = options.to;

  /* TODO: Make this email parsing better! */
  var uri = to.split('@')[0];

  userService.findByEmail(from, function(err, fromUser) {
    if(err) return callback(err);
    if(!fromUser) return callback("Access denied");

    findByUri(uri, function(err, troupe) {
      if(err) return callback(err);
      if(!troupe) return callback("Troupe not found for uri " + uri);

      if(!userHasAccessToTroupe(fromUser, troupe)) {
        return callback("Access denied");
      }

      return callback(null,troupe, fromUser);

    });
  });
}

function validateTroupeEmailAndReturnDistributionList(options, callback) {
  var from = options.from;
  var to = options.to;

  /* TODO: Make this email parsing better! */
  var uri = to.split('@')[0];

  userService.findByEmail(from, function(err, fromUser) {
    if(err) return callback(err);
    if(!fromUser) return callback("Access denied");

    findByUri(uri, function(err, troupe) {
      if(err) return callback(err);
      if(!troupe) return callback("Troupe not found for uri " + uri);
      if(!userHasAccessToTroupe(fromUser, troupe)) {
        return callback("Access denied");
      }

      userService.findByIds(troupe.getUserIds(), function(err, users) {
        if(err) return callback(err);

        var emailAddresses = users.map(function(user) {
          return user.email;
        });

        return callback(null, troupe, fromUser, emailAddresses);
      });
    });
  });
}

/*
 * This function takes in a userId and a list of troupes
 * It returns a hash that tells whether the user has access to each troupe,
 * or null if the troupe represented by the uri does not exist.
 * For example:
 * For the input validateTroupeUrisForUser('1', ['a','b','c'],...)
 * The callback could return:
 * {
 *   'a': true,
 *   'b': false,
 *   'c': null
 * }
 * Mean: User '1' has access to 'a', no access to 'b' and no troupe 'c' exists
 */
function validateTroupeUrisForUser(userId, uris, callback) {
  persistence.Troupe
    .where('uri').in(uris)
    .exec(function(err, troupes) {
      if(err) return callback(err);

      var troupesByUris = collections.indexByProperty(troupes, "uri");

      var result = {};
      uris.forEach(function(uri) {
        var troupe = troupesByUris[uri];
        if(troupe) {
          result[uri] = troupe.containsUserId(userId);
        } else {
          result[uri] = null;
        }
      });

      callback(null, result);
    });
}

function inviteUserByEmail(troupe, senderDisplayName, displayName, email, callback) {
  var code = uuid.v4();

  var invite = new persistence.Invite();
  invite.troupeId = troupe.id;
  invite.displayName = displayName;
  invite.email = email;
  invite.code = code;
  invite.save(function(err) {
    if(err) return callback(err);

    // TODO: should we treat registered users differently from unregistered people?
    // At the moment, we treat them all the same...

    emailNotificationService.sendInvite(troupe, displayName, email, code, senderDisplayName);
    callback();
  });


}

function findInviteById(id, callback) {
  persistence.Invite.findById(id, callback);
}

function findInviteByCode(code, callback) {
  persistence.Invite.findOne({code: code}, function(err, invite) {
    callback(err, invite);
  });
}

function findAllUnusedInvitesForTroupe(troupeId, callback) {
   persistence.Invite.where('troupeId').equals(troupeId)
      .where('status').equals('UNUSED')
      .sort({ displayName: 'asc', email: 'asc' } )
      .slaveOk()
      .exec(callback);
}

function removeUserFromTroupe(troupeId, userId, callback) {
   findById(troupeId, function(err, troupe) {
      troupe.removeUserById(userId);
      troupe.save(callback);
   });
}


/*
 * callback is function(err, request)
 */
function addRequest(troupeId, userId, callback) {
  persistence.Request.findOne({troupeId: troupeId, userId: userId}, function(err, request) {
    if(err) return callback(err);
    if(request) {
      /* Already exists */
      return callback(null, request);
    }

    request = new persistence.Request();
    request.troupeId = troupeId;
    request.userId = userId;
    request.save(function(err) {
      if(err) return callback(err);
      callback(null, request);
    });
  });
}

/*
 * callback is function(err, requests)
 */
function findAllOutstandingRequestsForTroupe(troupeId, callback) {
  persistence.Request
      .where('troupeId', troupeId)
      .where('status', 'PENDING')
      .slaveOk()
      .exec(callback);
}

function findPendingRequestForTroupe(troupeId, id, callback) {
  persistence.Request.findOne( {
    troupeId: troupeId,
    _id: id,
    status: 'PENDING'
  }, callback);
}


function findRequestsByIds(requestIds, callback) {
  persistence.Request.find( {
    _id: requestIds
  }, callback);
}

function findUserByIdEnsureConfirmationCode(userId, callback) {
  userService.findById(userId, function(err, user) {
    if(err) return callback(err);
    if(!user) return callback();

    // If the user doesn't have a confirmation code, give them one now
    if(!user.confirmationCode) {
      winston.info('User ' + userId + ' had no confirmation code, generating one now');
      user.confirmationCode = uuid.v4();
      user.save(function(err) {
        if(err) return callback(err);
        callback(null, user);
      });

      return;
    }

    return callback(null, user);
  });
}

function acceptRequest(request, callback) {
  winston.verbose('Accepting request to join ' + request.troupeId);

  findById(request.troupeId, function(err, troupe) {
    if(err) return callback(err);
    if(!troupe) { winston.error("Unable to find troupe", request.troupeId); return callback("Unable to find troupe"); }

    findUserByIdEnsureConfirmationCode(request.userId, function(err, user) {
      if(err) return callback(err);
      if(!user) { winston.error("Unable to find user", request.userId); return callback("Unable to find user"); }


      if(user.status === 'UNCONFIRMED') {
        emailNotificationService.sendConfirmationForNewUserRequest(user, troupe);
      } else {
        emailNotificationService.sendRequestAcceptanceToUser(user, troupe);
      }

      /** Add the user to the troupe */
      troupe.addUserById(user.id);

      troupe.save(function(err) {
        if(err) winston.error("Unable to save troupe", err);

        request.remove();
        return callback(err, request);
      });

    });
  });
}


function rejectRequest(request, callback) {
  findById(request.troupeId, function(err, troupe) {
    if(err) return callback(err);
    if(!troupe) { winston.error("Unable to find troupe", request.troupeId); return callback("Unable to find troupe"); }


    request.remove(function(err) {
      if(err) winston.error("Unable to save request", err);
      return callback(null);
    });
  });
}

function findUsersForTroupe(troupeId, callback) {
  persistence.Troupe.findById(troupeId, 'users', function(err, user) {
    if(err) return callback(err);
    callback(null, user.users);
  });
}

function updateTroupeName(troupeId, troupeName, callback) {
  findById(troupeId, function(err, troupe) {
    if (err) return callback(err);
    if (!troupe) return callback("Troupe not found");

    troupe.name = troupeName;
    troupe.save(function(err) {
      callback(err, troupe);
    });
  });
}

function createOneToOneTroupe(userId1, userId2, callback) {

  var troupe = new persistence.Troupe({
    uri: null,
    name: '',
    oneToOne: true,
    status: 'ACTIVE',
    users: [
      { userId: userId1 },
      { userId: userId2 }
    ]
  });

  troupe.save(function(err) {
    return callback(err, troupe);
  });
}

function findOrCreateOneToOneTroupe(currentUserId, userId2, callback) {
  if(currentUserId == userId2) return callback("You cannot be in a troupe with yourself.");

  userService.findById(userId2, function(err, user2) {
    if(err) return callback(err);
    if(!user2) return callback("User does not exist.");

    persistence.Troupe.findOne({
      //users: { $all: [ { userId: currentUserId }, { userId: userId2 } ]}
      $and: [
        { oneToOne: true },
        { 'users.userId': currentUserId },
        { 'users.userId': userId2 }
      ]
    }, function(err, troupe) {
      if(err) return callback(err);

      // If the troupe can't be found, then we need to create it....
      if(!troupe) {
        winston.info('Could not find one to one troupe for ' + currentUserId + ' and ' + userId2);
        return createOneToOneTroupe(currentUserId, userId2, function(err, troupe) {
          return callback(err, troupe, user2);
        });
      }

      return callback(null, troupe, user2);
    });

  });
}

function upgradeOneToOneTroupe(options, callback) {
  var name = options.name;
  var senderName = options.senderName;
  var invites = options.invites;
  var origTroupe = options.oneToOneTroupe.toObject();

  // create a new, normal troupe, with the current users from the one to one troupe
  var troupe = new persistence.Troupe({
    uri: createUniqueUri(),
    name: name,
    status: 'ACTIVE',
    users: origTroupe.users
  });

  troupe.save(function(err) {
    if(err) return callback(err);

    if(!invites || invites.length === 0) {
      return callback(null, troupe);
    }

    var f = new Fiber();

    // add invites for each additional person
    for(var i = 0; i < invites.length; i++) {
      var displayName = invites[i].displayName;
      var inviteEmail = invites[i].email;
      if (displayName && inviteEmail)
        inviteUserByEmail(troupe, senderName, displayName, inviteEmail, f.waitor());
    }

    f.all().then(function() { callback(null, troupe); }, callback);
  });
}

function createUniqueUri() {
  var chars = "0123456789abcdefghiklmnopqrstuvwxyz";

  var uri = "";
  for(var i = 0; i < 6; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    uri += chars.substring(rnum, rnum + 1);
  }

  return uri;
}

function updateFavourite(userId, troupeId, isFavourite, callback) {
  var setOp = {};
  setOp['favs.' + troupeId] = '1';
  var updateStatement;
  var updateOptions;

  if(isFavourite) {
    updateStatement = { $set: setOp };
    updateOptions = { upsert: true };
  } else {
    updateStatement = { $unset: setOp };
    updateOptions = { };
  }

  persistence.UserTroupeFavourites.update(
    { userId: userId },
    updateStatement,
    updateOptions,
    callback);
}

function findFavouriteTroupesForUser(userId, callback) {
  persistence.UserTroupeFavourites.findOne({ userId: userId}, function(err, userTroupeFavourites) {
    if(err) return callback(err);
    if(!userTroupeFavourites || !userTroupeFavourites.favs) return callback(null, {});

    return callback(null, userTroupeFavourites.favs);
  });
}

function findBestTroupeForUser(user, callback) {
  //
  // This code is invoked when a user's lastAccessedTroupe is no longer valid (for the user)
  // or the user doesn't have a last accessed troupe. It looks for all the troupes that the user
  // DOES have access to (by querying the troupes.users collection in mongo)
  // If the user has a troupe, it takes them to the first one it finds. If the user doesn't have
  // any valid troupes, it redirects them to an error message
  //

  if (user.lastTroupe) {
    findById(user.lastTroupe, function(err,troupe) {
      if(err) return callback(err);

      if(!troupe || !userHasAccessToTroupe(user, troupe)) {
        userService.findDefaultTroupeForUser(user.id, callback);
        return;
      }

      callback(null, troupe);
    });
    return;
  }

  userService.findDefaultTroupeForUser(user.id, callback);
}

//
// Create a new troupe and return callback(err, troupe)
//
function createNewTroupeForExistingUser(options, callback) {
  var name = options.name;
  var oneToOneTroupeId = options.oneToOneTroupeId;
  var user = options.user;
  var invites = options.invites;

  name = name ? name.trim() : '';
  if(!name) return callback('Please provide a troupe name');

  if (oneToOneTroupeId) {
    // find this 1-1 troupe and create a new normal troupe with the additional person(s) invited
    findById(oneToOneTroupeId, function(err, troupe) {
      if(!userHasAccessToTroupe(user, troupe)) {
        return callback(403);
      }

      upgradeOneToOneTroupe({ name: name, oneToOneTroupe: troupe, senderName: user.name, invites: invites }, callback);
    });

    return;
  }

  // create a troupe normally
  var troupe = new persistence.Troupe();
  troupe.name = name;
  troupe.uri = createUniqueUri();
  troupe.addUserById(user.id);

  troupe.save(function(err) {
    if(err) return callback(err);

    var f = new Fiber();

    if (invites) {
      // add invites for each additional person
      for(var i = 0; i < invites.length; i++) {
        var displayName = invites[i].displayName;
        var inviteEmail = invites[i].email;
        if (displayName && inviteEmail)
          inviteUserByEmail(troupe, user.displayName, displayName, inviteEmail, f.waitor());
        }
    }

    f.all().then(function() {
      callback(null, troupe);
    }, callback);
  });
}

// Accept an invite, returns callback(err, user, alreadyExists)
// NB NB NB user should only ever be set iff the invite is valid
function acceptInvite(confirmationCode, troupeUri, callback) {
  findInviteByCode(confirmationCode, function(err, invite) {
    if(err) return callback(err);

    if(!invite) {
      winston.error("Invite confirmationCode=" + confirmationCode + " not found. ");
      return callback(null, null);
    }

    if(invite.status !== 'UNUSED') {
      /* The invite has already been used. We need to fail authentication, but go to the troupe */
      winston.verbose("Invite has already been used", { confirmationCode: confirmationCode, troupeUri: troupeUri });
      statsService.event('invite_reused', { uri: troupeUri });

      // There's a chance a user has accepted an invite but hasn't completed their profile
      // In which case we allow them through
      userService.findByEmail(invite.email, function(err, user) {
        if(err) return callback(err);

        // If the user has clicked on the invite, but hasn't completed their profile (as in does not have a password)
        // then we'll give them a special dispensation and allow them to access the site (otherwise they'll never get in)
        if (user && user.status == 'PROFILE_NOT_COMPLETED') {
          return callback(null, user, false);
        }

        return callback(null, null, true);
      });

    } else {
      statsService.event('invite_accepted', { uri: troupeUri });

      winston.verbose("Invite accepted", { confirmationCode: confirmationCode, troupeUri: troupeUri });

      userService.findOrCreateUserForEmail({
        displayName: invite.displayName,
        email: invite.email,
        status: "PROFILE_NOT_COMPLETED"
      }, function(err, user) {
        if(err) return callback(err);

        // confirm the user if they are not already.
        if (user.status == 'UNCONFIRMED') {
          user.status = 'PROFILE_NOT_COMPLETED';
          user.save();
        }

        findById(invite.troupeId, function(err, troupe) {
          if(err) return callback(err);
          if(!troupe) return callback(404);

          var originalStatus = invite.status;
          if(originalStatus != 'UNUSED') {
            return callback(null, null, true);
          }

          invite.status = 'USED';
          invite.save(function(err) {
            if(err) return callback(err);

            troupe.addUserById(user.id);
            troupe.save(function(err) {
              if(err) return callback(err);
              return callback(null, user, false);
            });
          });



        });
      });
    }

  });
}

module.exports = {
  findByUri: findByUri,
  findById: findById,
  findByIds: findByIds,
  findAllTroupesForUser: findAllTroupesForUser,
  findAllTroupesIdsForUser: findAllTroupesIdsForUser,
  validateTroupeEmail: validateTroupeEmail,
  validateTroupeEmailAndReturnDistributionList: validateTroupeEmailAndReturnDistributionList,
  userHasAccessToTroupe: userHasAccessToTroupe,
  userIdHasAccessToTroupe: userIdHasAccessToTroupe,
  inviteUserByEmail: inviteUserByEmail,
  findInviteById: findInviteById,
  findInviteByCode: findInviteByCode,
  findMemberEmails: findMemberEmails,
  findAllUnusedInvitesForTroupe: findAllUnusedInvitesForTroupe,
  addRequest: addRequest,
  findRequestsByIds: findRequestsByIds,
  findAllOutstandingRequestsForTroupe: findAllOutstandingRequestsForTroupe,
  findPendingRequestForTroupe: findPendingRequestForTroupe,
  acceptRequest: acceptRequest,
  rejectRequest: rejectRequest,
  removeUserFromTroupe: removeUserFromTroupe,
  findUsersForTroupe: findUsersForTroupe,
  validateTroupeUrisForUser: validateTroupeUrisForUser,
  updateTroupeName: updateTroupeName,
  findOrCreateOneToOneTroupe: findOrCreateOneToOneTroupe,
  upgradeOneToOneTroupe: upgradeOneToOneTroupe,
  createUniqueUri: createUniqueUri,

  updateFavourite: updateFavourite,
  findFavouriteTroupesForUser: findFavouriteTroupesForUser,
  findBestTroupeForUser: findBestTroupeForUser,
  createNewTroupeForExistingUser: createNewTroupeForExistingUser,
  acceptInvite: acceptInvite
};