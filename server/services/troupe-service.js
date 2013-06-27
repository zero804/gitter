/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global require: true, module: true */
"use strict";

var persistence = require("./persistence-service"),
    userService = require("./user-service"),
    appEvents = require("../app-events"),
    assert = require("assert"),
    emailNotificationService = require("./email-notification-service"),
    presenceService = require("./presence-service"),
    uuid = require('node-uuid'),
    winston = require("winston"),
    collections = require("../utils/collections"),
    Q = require("q"),
    _ = require('underscore'),
    assert = require('assert'),
    statsService = require("../services/stats-service");

var ObjectID = require('mongodb').ObjectID;

function findByUri(uri, callback) {
  return persistence.Troupe.findOneQ({uri: uri})
    .nodeify(callback);
}

function findByIds(ids, callback) {
  return persistence.Troupe
    .where('_id')['in'](collections.idsIn(ids))
    .execQ()
    .nodeify(callback);
}

function findById(id, callback) {
  return persistence.Troupe.findByIdQ(id)
    .nodeify(callback);
}

function findByIdRequired(id) {
  return persistence.Troupe.findByIdQ(id).then(function(t) {
    if(!t) throw 404;
    return t;
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
    .exec(callback);
}

function findAllTroupesIdsForUser(userId, callback) {
  persistence.Troupe
    .where('users.userId', userId)
    .select('id')
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
    .where('uri')['in'](uris)
    .where('status', 'ACTIVE')
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

/**
 * Add the specified user to the troupe,
 * @param {[type]} userId
 * @param {[type]} troupeId
 * returns a promise with the troupe
 */
function addUserIdToTroupe(userId, troupeId) {
  return findByIdRequired(troupeId)
      .then(function(troupe) {

        if(troupe.containsUserId(userId)) {
          return troupe;
        }

        troupe.addUserById(userId);
        return troupe.saveQ()
            .then(function() { return troupe; });
      });
}

/**
 * Notify existing users of invites. This method does not handle email-only invites for non-registered email addresses
 * @param  {[type]} invites
 * @return promise of undefined
 */
function notifyRecipientsOfInvites(invites) {
  var userIds = collections.idsIn(
                  invites.map(function(i) { return i.userId; })
                    .concat(invites.map(function(i) { return i.fromUserId; })));

  var troupeIds = collections.idsIn(invites.map(function(i) { return i.troupeId; }));

  // Check if the user is online
  var d = Q.defer();
  presenceService.categorizeUsersByOnlineStatus(userIds, d.makeNodeResolver());

  return Q.all([
    userService.findByIds(userIds),
    findByIds(troupeIds),
    d.promise
    ]).spread(function(users, troupes, onlineUsers) {
      troupes = collections.indexById(troupes);
      users = collections.indexById(users);

      var promises = invites.map(function(invite) {
        var toUserId = invite.userId;
        var userIsOnline = onlineUsers[toUserId];

        var troupe = troupes[invite.troupeId];
        var toUser = users[toUserId];
        var fromUser = users[invite.fromUserId];

        assert(fromUser, 'Could not find fromUser');
        assert(toUser, 'Could not find toUser. notifyRecipientsOfInvites only deals with existing user recipients, not email recipients');

        if(userIsOnline) {
          var text, uri;
          if(invite.troupeId && troupe) {
            text = "You've been invited to join the Troupe: " + troupe.name;
            uri = troupe.uri;
          } else if(!invite.troupeId && fromUser) {
            text = fromUser.displayName + " has invited you to connect";
            uri = fromUser.getHomeUrl();
          }

          appEvents.userNotification({
            userId: toUserId,
            troupeId: troupe ? troupe.id : undefined,
            // TODO: add onetoone bits in to this invite
            title: "New Invitation",
            text: text,
            link: uri,
            sound: "invitation"
          });
          return;
        } else {
          invite.emailSentAt = Date.now();
          return invite.saveQ()
            .then(function() {
              // The user is not online, send them an email
              if(troupe) {
                emailNotificationService.sendInvite(troupe, toUser.displayName, toUser.email, invite.code, fromUser.displayName);
              } else if(!invite.troupeId) {
                // One to one
                emailNotificationService.sendConnectInvite(fromUser.getHomeUrl(), toUser.displayName, toUser.email, invite.code, fromUser.displayName);
              }

            });


        }

      });

      return Q.all(promises);
  });
}

/**
 * Invite an existing user to join a troupe or connect with another user
 * @param  {[ObjectId]} troupe optional
 * @param  {[ObjectId]} fromUserId the user initiating the connection
 * @param  {[ObjectId]} toUserId the recipient
 * @return {[type]} promise with invite
 */
function inviteUserByUserId(troupe, fromUser, toUserId) {
  assert(fromUser, "fromUser expected");
  assert(toUserId, "toUserId expected");

  // Find the user
  return userService.findById(toUserId)
      .then(function(toUser) {

        var fromUserId = fromUser.id;

        assert(toUser, "toUserId " + toUser + " not found");

        var fromUserIsUnconfirmed = fromUser.status == 'UNCONFIRMED';
        var toUserIsUnconfirmed = toUser.status == 'UNCONFIRMED';

        // Look for an existing invite
        var query = { status: fromUserIsUnconfirmed ? "UNCONFIRMED" : "UNUSED", userId: toUserId };
        if(!troupe) {
          query.fromUserId = fromUserId;
        } else {
          query.troupeId = troupe.id;
        }

        return persistence.Invite.findOneQ(query)
          .then(function(existingInvite) {

            // Existing invite? Use it
            if (existingInvite) {
              return existingInvite;
            }

            // No exiting invite, create a new invite
            return persistence.Invite.createQ({
              troupeId: troupe ? troupe.id : null,
              fromUserId: fromUserId,
              userId: toUserId,
              displayName: null, // Don't set this if we're using a userId
              email: null,       // Don't set this if we're using a userId
              code: toUserIsUnconfirmed ? uuid.v4() : null,
              status: fromUserIsUnconfirmed ? "UNCONFIRMED" : "UNUSED"
            });

          }).then(function(invite) {
            // Notify the recipient
            if(fromUserIsUnconfirmed) return invite;

            return notifyRecipientsOfInvites([invite])
                    .then(function() {
                      return invite;
                    });
          });

    });
}

/**
 * Invite by email
 * @param  {[type]} troupe optional - not supplied for one to one invitations
 * @param  {[type]} fromUserId the user making the request
 * @param  {[type]} displayName (optional) the name of the recipient
 * @param  {[type]} email the email address of the recipient
 * @return {[type]} promise with invite
 */
function inviteUserByEmail(troupe, fromUser, displayName, email) {
  assert(fromUser, "fromUser expected");
  assert(email, "email expected");

  // Only non-registered users should go through this flow.
  // Check if the email is registered to a user.
  return userService.findByEmail(email)
    .then(function(user) {

      if(user) {
        return inviteUserByUserId(troupe, fromUser, user.id);
      }

      var fromUserId = fromUser.id;

      return persistence.Invite.findOneQ({ status: "UNUSED", troupeId: troupe.id, email: email })
          .then(function(existingInvite) {
            // Found an existing invite? Don't create a new one then
            if(existingInvite) return existingInvite;

            statsService.event('new_user_invite', { fromUserId: fromUserId, email: email });

            // create the invite and send mail immediately

            return persistence.Invite.createQ({
              troupeId: troupe.id,
              fromUser: fromUserId,
              displayName: displayName,
              email: email,
              emailSentAt: Date.now(),
              code: uuid.v4()
            });

          }).then(function(invite) {

            if(troupe) {
              // For new or existing invites, send the user an email
              emailNotificationService.sendInvite(troupe, displayName, email, invite.code, fromUser.displayName);
            } else {
              // For new or existing invites, send the user an email
              emailNotificationService.sendConnectInvite(fromUser.getHomeUrl(), displayName, email, invite.code, fromUser.displayName);
            }

            return invite;
          });

    });
}

/**
 * Invite a user to either join a troupe or connect for one-to-one chats
 * @param  {[type]}   troupe (optional)
 * @param  {[type]}   invite ({ fromUser / userId / displayName / email  })
 * @return {[type]}   promise of an invite
 */
function createInvite(troupe, invite, callback) {
  return Q.resolve(null)
    .then(function() {

      assert(invite.fromUser, 'fromUser required');

      if(invite.userId) {
        return inviteUserByUserId(troupe, invite.fromUser, invite.userId);
      }

      if(invite.email) {
        return inviteUserByEmail(troupe, invite.fromUser, invite.displayName, invite.email);
      }

      throw "Invite needs an email or userId";
    }).nodeify(callback);
}

function findInviteById(id, callback) {
  return persistence.Invite.findByIdQ(id)
    .nodeify(callback);
}

function findAllUnusedInvitesForTroupe(troupeId, callback) {
   persistence.Invite.where('troupeId').equals(troupeId)
      .where('status').equals('UNUSED')
      .sort({ displayName: 'asc', email: 'asc' } )
      .exec(callback);
}

function findUnusedInviteToTroupeForEmail(email, troupeId, callback) {
  persistence.Invite.findOne({ troupeId: troupeId, email: email, status: 'UNUSED' }, callback);
}


function findUnusedInviteToTroupeForUserId(userId, troupeId, callback) {
  return persistence.Invite.findOneQ({ troupeId: troupeId, userId: userId, status: 'UNUSED' }).nodeify(callback);
}

/**
 * Find an unused invite from fromUserId to toUserId for toUserId to connect with fromUserId
 * @param  {[type]} fromUserId
 * @param  {[type]} toUserId
 * @return {[type]} promise with invite
 */
function findUnusedOneToOneInviteFromUserIdToUserId(fromUserId, toUserId) {
  return persistence.Invite.findOneQ({
      troupeId: null, // This indicates that it's a one-to-one invite
      fromUserId: fromUserId,
      userId: toUserId,
      status: 'UNUSED'
    });
}

/**
 * Finds all unconfirmed invites for a recently confirmed user,
 * notifies recipients
 * @return {promise} no value
 */
function updateUnconfirmedInvitesForUserId(userId) {
  return persistence.Invite.findQ({ fromUserId: userId, status: 'UNCONFIRMED' })
      .then(function(invites) {
        var promises = invites.map(function(invite) {
          invite.status = 'UNUSED';
          return invite.saveQ().then(function() {
            return invite;
          });
        });
        return Q.all(promises)
          .then(function(invites) {
            return notifyRecipientsOfInvites(invites);
          });
      });
}


function updateInvitesForEmailToUserId(email, userId, callback) {
  return persistence.Invite.updateQ(
    { email: email },
    {
      userId: userId,
      email: null,
      displayName: null
    },
    { multi: true })
    .then(function() {
      return true;
    })
    .nodeify(callback);
}

function findAllUnusedInvitesForUserId(userId, callback) {
  return persistence.Invite.where('userId').equals(userId)
    .where('status').equals('UNUSED')
    .sort({ createdAt: 'asc' } )
    .execQ()
    .nodeify(callback);
}

function findAllUnusedInvitesForEmail(email, callback) {
  return persistence.Invite.where('email').equals(email)
    .where('status').equals('UNUSED')
    .sort({ displayName: 'asc', email: 'asc' } )
    .execQ()
    .nodeify(callback);
}

function removeUserFromTroupe(troupeId, userId, callback) {
  findById(troupeId, function(err, troupe) {
    if(err) return callback(err);
    if(!troupe) return callback('Troupe ' + troupeId + ' does not exist.');

    // TODO: Add the user to a removeUsers collection
    var deleteRecord = new persistence.TroupeRemovedUser({
      userId: userId,
      troupeId: troupeId
    });

    deleteRecord.save(function(err) {
      if(err) return callback(err);

      // TODO: Let the user know that they've been removed from the troupe (via email or something)
      troupe.removeUserById(userId);
      if(troupe.users.length === 0) {
        return callback("Cannot remove the last user from a troupe");
      }
      troupe.save(callback);
    });
  });
}


/**
 * Create a request or simply return an existing one
 * returns a promise of a request
 */
function addRequest(troupe, userId) {
  assert(troupe, 'Troupe parameter is required');

  return persistence.Request.findOneQ({
    troupeId: troupe.id,
    userId: userId,
    status: 'PENDING'})
    .then(function(request) {
      // Request already made....
      if(request) return request;

      if(userIdHasAccessToTroupe(userId, troupe)) {
        throw { memberExists: true };
      }

      return  persistence.Request.createQ({
        troupeId: troupe.id,
        userId: userId
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

  persistence.Request
    .where('_id')['in'](requestIds)
    .exec(callback);

}

/*
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
*/

/**
 * Accept a request: add the user to the troupe and delete the request
 * @return promise of undefined
 */
function acceptRequest(request, callback) {
  winston.verbose('Accepting request to join ' + request.troupeId);

  var userId = request.userId;

  return findById(request.troupeId)
    .then(function(troupe) {
      if(!troupe) { winston.error("Unable to find troupe", request.troupeId); throw "Unable to find troupe"; }

      return userService.findById(userId)
        .then(function(user) {
          if(!user) { winston.error("Unable to find user", request.userId); throw "Unable to find user"; }

          emailNotificationService.sendRequestAcceptanceToUser(user, troupe);

          return addUserIdToTroupe(userId, troupe)
              .then(function() {
                return request.removeQ();
              });
        });
    })
    .nodeify(callback);

}


/**
 * Rjected a request: delete the request
 * @return promise of undefined
 */
function rejectRequest(request, callback) {
  winston.verbose('Rejecting request to join ' + request.troupeId);

  return request.removeQ()
    .nodeify(callback);
}

function findUserIdsForTroupe(troupeId, callback) {
  persistence.Troupe.findById(troupeId, 'users', function(err, troupe) {
    if(err) return callback(err);
    callback(null, troupe.users.map(function(m) { return m.userId; }));
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
  return persistence.Troupe.createQ({
      uri: null,
      name: '',
      oneToOne: true,
      status: 'ACTIVE',
      users: [
        { userId: userId1 },
        { userId: userId2 }
      ]
    }).nodeify(callback);
}

// Returns true if the two users share a common troupe
// In future, will also return true if the users share an organisation
function findImplicitConnectionBetweenUsers(userId1, userId2, callback) {
  return persistence.Troupe.findOneQ({
          $and: [
            { 'users.userId': userId1 },
            { 'users.userId': userId2 }
          ]
        }, "_id")
    .then(function(troupe) {
      return !!troupe;
    })
    .nodeify(callback);
}

/**
 * Find a one-to-one troupe, otherwise create it if possible (if there is an implicit connection),
 * otherwise return the existing invite if possible
 *
 * @return {[ troupe, other-user, invite ]}
 */
function findOrCreateOneToOneTroupe(fromUserId, toUserId, callback) {
  if(fromUserId == toUserId) return callback("You cannot be in a troupe with yourself.");

  return userService.findById(toUserId)
    .then(function(toUser) {
      if(!toUser) throw "User does not exist";

      /* Find the existing one-to-one.... */
      return [toUser, persistence.Troupe.findOneQ({
        $and: [
          { oneToOne: true },
          { 'users.userId': fromUserId },
          { 'users.userId': toUserId }
        ]
      })];
    })
    .spread(function(toUser, troupe) {

      // Found the troupe? Perfect!
      if(troupe) return [ troupe, toUser, null ];

      return findImplicitConnectionBetweenUsers(fromUserId, toUserId)
          .then(function(implicitConnection) {
            if(implicitConnection) {
              // There is an implicit connection between these two users,
              // automatically create the troupe
              return createOneToOneTroupe(fromUserId, toUserId)
                .then(function(troupe) {
                  return [ troupe, toUser, null ];
                });
            }

            // There is no implicit connection between the users, don't create the troupe
            // However, do tell the caller whether or not this user already has an invite to the
            // other user to connect

            // Otherwise the users cannot onnect the and the user will need to invite the other user
            // to connect explicitly.
            // Check if the user has already invited the other user to connect

            // Look to see if the other user has invited this user to connect....
            // NB from and to users are swapped around here as we are looking for the correlorary (sp)
            return findUnusedOneToOneInviteFromUserIdToUserId(toUserId, fromUserId)
              .then(function(invite) {
                return [ null, toUser, invite ];
              });

          });

    })
    .nodeify(callback);

}

/**
 * Take a one to one troupe and turn it into a normal troupe with extra invites
 * @return promise with new troupe
 */
function upgradeOneToOneTroupe(options, callback) {
  var name = options.name;
  var fromUser = options.user;
  var invites = options.invites;
  var origTroupe = options.oneToOneTroupe.toObject();

  // create a new, normal troupe, with the current users from the one to one troupe
  return persistence.Troupe.createQ({
      uri: createUniqueUri(),
      name: name,
      status: 'ACTIVE',
      users: origTroupe.users
    })
    .then(function(troupe) {
      if(!invites || invites.length === 0) return troupe;

      var promises = invites.map(function(invite) {
          return createInvite(troupe, {
            fromUser: fromUser,
            email: invite.email,
            displayName: invite.displayName,
            userId: invite.userId
          });
        });

      // Create invites for all the users
      return Q.all(promises)
        .then(function() {
          return troupe;
        });

    })
    .nodeify(callback);

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

function findAllUserIdsForTroupes(troupeIds, callback) {
  if(!troupeIds.length) return callback(null, []);

  var mappedTroupeIds = troupeIds.map(function(d) {
    if(typeof d === 'string') return new ObjectID('' + d);
    return d;
  });

  persistence.Troupe.aggregate([
    { $match: { _id: { $in: mappedTroupeIds } } },
    { $project: { _id: 0, 'users.userId': 1 } },
    { $unwind: '$users' },
    { $group: { _id: 1, userIds: { $addToSet: '$users.userId' } } }
    ], function(err, results) {
      if(err) return callback(err);
      var result = results[0];
      if(!result || !result.userIds || !result.userIds.length) return callback(null, []);

      return callback(null, result.userIds);
    });
}


function findBestTroupeForUser(user, callback) {
  //
  // This code is invoked when a user's lastAccessedTroupe is no longer valid (for the user)
  // or the user doesn't have a last accessed troupe. It looks for all the troupes that the user
  // DOES have access to (by querying the troupes.users collection in mongo)
  // If the user has a troupe, it takes them to the last one they accessed. If the user doesn't have
  // any valid troupes, it returns an error.
  //

  if (user.lastTroupe) {
    findById(user.lastTroupe, function(err,troupe) {
      if(err) return callback(err);

      if(!troupe || troupe.status == 'DELETED' || !userHasAccessToTroupe(user, troupe)) {
        return findLastAccessedTroupeForUser(user, callback);
      }

      callback(null, troupe);
    });
    return;
  }

  return findLastAccessedTroupeForUser(user, callback);
}

function findLastAccessedTroupeForUser(user, callback) {
  persistence.Troupe.find({ 'users.userId': user.id, 'status': 'ACTIVE' }, function(err, activeTroupes) {
    if(err) return callback(err);
    if (!activeTroupes || activeTroupes.length === 0) callback(null, null);

    userService.getTroupeLastAccessTimesForUser(user.id, function(err, troupeAccessTimes) {
      if(err) return callback(err);

      activeTroupes.forEach(function(troupe) {
        troupe.lastAccessTime = troupeAccessTimes[troupe._id];
      });

      var troupes = _.sortBy(activeTroupes, function(t) {
        return (t.lastAccessTime) ? t.lastAccessTime : 0;
      }).reverse();

      _.find(troupes, function(troupe) {

        if (userHasAccessToTroupe(user, troupe)) {
          callback(null, troupe);
          return true;
        }
      });
    });

  });

}

//
// Create a new troupe and return callback(err, troupe)
//
function createNewTroupeForExistingUser(options, callback) {
  return Q.resolve(null).then(function() {
    var name = options.name;
    var oneToOneTroupeId = options.oneToOneTroupeId;
    var user = options.user;
    var invites = options.invites;

    name = name ? name.trim() : '';

    assert(user, 'user required');
    assert(name, 'Please provide a troupe name');

    if (oneToOneTroupeId) {
      // find this 1-1 troupe and create a new normal troupe with the additional person(s) invited
      return findById(oneToOneTroupeId)
        .then(function(troupe) {
          if(!userHasAccessToTroupe(user, troupe)) {
            throw 403;
          }

          return upgradeOneToOneTroupe({ name: name, oneToOneTroupe: troupe, user: user, invites: invites });
        });
    }

    // create a troupe normally
    var troupe = new persistence.Troupe({
      name: name,
      uri: createUniqueUri()
    });
    troupe.addUserById(user.id);

    return troupe.saveQ()
      .then(function() {

        if(!invites) return troupe;

        var promises = invites.map(function(invite) {
          var displayName = invite.displayName;
          var inviteEmail = invite.email;
          var toUserId = invite.userId;

          if (displayName && inviteEmail || toUserId) {
            return createInvite(troupe, {
                fromUser: user,
                displayName: displayName,
                email: inviteEmail,
                userId: toUserId
              });
          }
        });

        return Q.all(promises).then(function() {
          return troupe;
        });
      });

  }).nodeify(callback);

}

// so that the invite doesn't show up in the receiver's list of pending invitations
// marks the invite as used
function rejectInviteForAuthenticatedUser(user, inviteId, callback) {
  assert(user); assert(inviteId);

  findInviteById(inviteId, function(err, invite) {
    if(err) return callback(err);

    if(invite.email !== user.email && invite.userId != user.id) {
      winston.error('User attempted to reject an invite that doesnt belong to them', {
        userId: user.id,
        userEmail: user.email,
        inviteId: invite.id,
        inviteUserId: "" + invite.userId,
        inviteEmail: invite.email
      });

      return callback(401);
    }

    if(!invite) {
      winston.error("Invite id=" + inviteId + " not found. ");
      return callback(null, null);
    }

    statsService.event('invite_rejected', { inviteId: inviteId });
    winston.verbose("Invite rejected", { inviteId: inviteId });

    markInviteUsedAndDeleteAllSimilarOutstandingInvites(invite, callback);
  });

}

function acceptInviteForAuthenticatedUser(user, inviteId, callback) {
  assert(user, 'User parameter required');
  assert(inviteId, 'inviteId parameter required');

  // check that the logged in user owns this invite
  // mark as used.
  findInviteById(inviteId, function(err, invite) {
    if(err) return callback(err);

    if(!invite) {
      return callback("No such invite found");
    }

    if(invite.email !== user.email && invite.userId != user.id) {
      return callback(401);
    }

    if(invite.status !== 'UNUSED') {
      // invite has been used, we can't use it again.
      winston.verbose("Invite has already been used", { inviteId: invite.id });
      statsService.event('invite_reused', { inviteId: inviteId });

      callback("Invite has already been used");
    } else {
      // use and delete invite
      statsService.event('invite_accepted', { inviteId: inviteId });
      winston.verbose("Invite accepted", { inviteId: inviteId });


      // IF this is an invite to join a troupe...
      if(invite.troupeId) {
        // find the troupe
        findById(invite.troupeId, function(err, troupe) {
          if(err) return callback(err);
          if(!troupe) return callback(404);
          if(troupe.status != 'ACTIVE') return callback({ troupeNoLongerActive: true });

          troupe.addUserById(user.id);
          troupe.save(function(err) {
            if(err) return callback(err);

            markInviteUsedAndDeleteAllSimilarOutstandingInvites(invite, callback);
          });

        });
        return;
      }

      // Otherwise, this is an invite to connect with a user
      createOneToOneTroupe(invite.fromUserId, invite.userId, function(err) {
        if(err) return callback(err);

        markInviteUsedAndDeleteAllSimilarOutstandingInvites(invite, callback);
      });

    }

  });
}

/**
 * Given a
 * @param  {[type]} invite
 * @return {[type]}
 */
function findRecipientForInvite(invite) {
  if(invite.userId) {
    return userService.findById(invite.userId);
  }

  return userService.findByEmail(invite.email);
}

// Accept an invite, returns callback(err, user, alreadyExists)
// NB NB NB user should only ever be set iff the invite is valid
/**
 * Accepts an invite
 * @param  {String}   confirmationCode
 * @param  {String}   troupeUri
 * @param  {Function} callback
 * @return {promise}  promise with { user: x, alreadyUsed: bool } if the invitation is valid
 */
function acceptInvite(confirmationCode, troupeUri, callback) {
  return persistence.Invite.findOneQ({ code: confirmationCode })
    .then(function(invite) {
      if(!invite) {
        winston.error("Invite confirmationCode=" + confirmationCode + " not found. ");
        return { user: null };
      }

      return findRecipientForInvite(invite)
        .then(function(user) {
          // If the user doesn't exist and the invite is not used,
          // create the user
          if(!user && invite.status !== 'USED') {
            return userService.findOrCreateUserForEmail({
              displayName: invite.displayName,
              email: invite.email,
              status: "PROFILE_NOT_COMPLETED"
            });
          }

          return user;
        })
        .then(function(user) {

          if(invite.status === 'USED') {
            /* The invite has already been used. We need to fail authentication (if they have completed their profile), but go to the troupe */
            winston.verbose("Invite has already been used", { confirmationCode: confirmationCode, troupeUri: troupeUri });
            statsService.event('invite_reused', { uri: troupeUri });

            // If the user has clicked on the invite, but hasn't completed their profile (as in does not have a password)
            // then we'll give them a special dispensation and allow them to access the site (otherwise they'll never get in)
            if (user && user.status == 'PROFILE_NOT_COMPLETED') {
              return { user: user };
            }

            return { user: null, alreadyUsed: true };
          }

          // Invite is good to accept

          statsService.event('invite_accepted', { uri: troupeUri });
          winston.verbose("Invite accepted", { confirmationCode: confirmationCode, troupeUri: troupeUri });

          var confirmOperation = null;
          // confirm the user if they are not already.
          if (user.status == 'UNCONFIRMED') {
            user.status = 'PROFILE_NOT_COMPLETED';
            confirmOperation = user.saveQ()
                .then(function() {
                  return updateUnconfirmedInvitesForUserId(user.id);
                });
          }

          return Q.all([
              confirmOperation,
              invite.troupeId  ? addUserIdToTroupe(user.id, invite.troupeId) :
                                 findOrCreateOneToOneTroupe(user.id, invite.fromUserId)
            ])
            .spread(function(userSaveResult, troupe) {
              return markInviteUsedAndDeleteAllSimilarOutstandingInvites(invite).then(function() {
                return { user: user, url: troupe.getUrl(user.id) };
              });
            });

        });

    })
    .nodeify(callback);
}

function sendPendingInviteMails(delaySeconds, callback) {
  var count = 0;
  delaySeconds = (delaySeconds === null) ? 10 * 60 : delaySeconds;
  var searchParams = {
    status: "UNUSED",
    createdAt: { $lt: Date.now() - delaySeconds },
    emailSentAt: null
  };

  return persistence.Invite.findQ(searchParams)
    .then(function(invites) {
      winston.info("Found " + invites.length + " pending invites to email");

      var troupeIds   = invites.map(function(i) { return i.troupeId; });
      var fromUserIds = invites.map(function(i) { return i.fromUserId; });
      var toUserIds   = invites.map(function(i) { return i.toUserId; });

      return Q.all([
        findByIds(troupeIds),
        userService.findByIds(fromUserIds.concat(toUserIds))
        ])
        .spread(function(troupes, users) {
          troupes = collections.indexById(troupes);
          users = collections.indexById(users);

          var promises = invites.map(function(invite) {
            var email, displayName;

            // Do the save first so that we dont' retry dodgy invites
            invite.emailSentAt = Date.now();
            return invite.saveQ().then(function() {

              if(invite.userId) {
                var user = users[invite.userId];
                if(!user) {
                  winston.error('Unable to find recipient user ' + invite.userId + '. Will not send out invite');
                  return;
                }
                email = user.email;
                displayName = user.displayName;
              } else {
                email = invite.email;
                displayName = invite.displayName;
              }

              var fromUser = users[invite.fromUserId];
              if(!fromUser) {
                winston.error('Unable to find from user ' + invite.fromUserId + '. Will not send out invite');
                return;
              }

              if(invite.troupeId) {
                var troupe = troupes[invite.troupeId];
                if(!troupe) {
                  winston.error('Unable to find troupe ' + invite.troupeId+ '. Will not send out invite');
                  return;
                }

                emailNotificationService.sendInvite(troupe, displayName, email, invite.confirmationCode, fromUser.displayName);
              } else {
                // One-to-one type invite
                emailNotificationService.sendConnectInvite(fromUser.getHomeUrl(), displayName, email, invite.confirmationCode, fromUser.displayName);
              }

            });

          });

          return Q.all(promises).then(function() {
            return invites.length;
          });
        });

    })
    .nodeify(callback);
}

function markInviteUsedAndDeleteAllSimilarOutstandingInvites(invite, callback) {
  assert(invite);

  invite.status = 'USED';
  return invite.saveQ()
      .then(function() {

        var similarityQuery = { status: 'UNUSED', userId: invite.userId };
        if(invite.troupeId) {
          similarityQuery.troupeId = invite.troupeId;
        } else {
          similarityQuery.fromUserId = invite.fromUserId;
          similarityQuery.troupeId = null; // Important to signify that its a one-to-one invite
        }

        return persistence.Invite.updateQ(similarityQuery, { status: 'INVALID' }, { multi: true })
            .then(function() {
              return invite;
            });

      }).nodeify(callback);
}

function deleteTroupe(troupe, callback) {
  if(troupe.status != 'ACTIVE') return callback("Troupe is not active");
  if(troupe.users.length !== 1) return callback("Can only delete troupes that have a single user");

  troupe.status = 'DELETED';
  troupe.dateDeleted = new Date();
  troupe.removeUserById(troupe.users[0].userId);
  troupe.save(callback);
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
  createInvite: createInvite,
  findInviteById: findInviteById,
  findMemberEmails: findMemberEmails,
  findAllUnusedInvitesForTroupe: findAllUnusedInvitesForTroupe,
  findAllUnusedInvitesForEmail: findAllUnusedInvitesForEmail,
  findAllUnusedInvitesForUserId: findAllUnusedInvitesForUserId,
  findUnusedInviteToTroupeForUserId: findUnusedInviteToTroupeForUserId,
  findImplicitConnectionBetweenUsers: findImplicitConnectionBetweenUsers,
  updateUnconfirmedInvitesForUserId: updateUnconfirmedInvitesForUserId,

  inviteUserByUserId: inviteUserByUserId,

  updateInvitesForEmailToUserId: updateInvitesForEmailToUserId,

  addRequest: addRequest,
  findRequestsByIds: findRequestsByIds,
  findAllOutstandingRequestsForTroupe: findAllOutstandingRequestsForTroupe,
  findPendingRequestForTroupe: findPendingRequestForTroupe,
  acceptRequest: acceptRequest,
  rejectRequest: rejectRequest,
  removeUserFromTroupe: removeUserFromTroupe,

  findAllUserIdsForTroupes: findAllUserIdsForTroupes,
  findUserIdsForTroupe: findUserIdsForTroupe,
  findUsersForTroupe: findUsersForTroupe,

  validateTroupeUrisForUser: validateTroupeUrisForUser,
  updateTroupeName: updateTroupeName,
  findOrCreateOneToOneTroupe: findOrCreateOneToOneTroupe,
  createUniqueUri: createUniqueUri,
  deleteTroupe: deleteTroupe,

  updateFavourite: updateFavourite,
  findFavouriteTroupesForUser: findFavouriteTroupesForUser,
  findBestTroupeForUser: findBestTroupeForUser,
  createNewTroupeForExistingUser: createNewTroupeForExistingUser,
  acceptInvite: acceptInvite,
  acceptInviteForAuthenticatedUser: acceptInviteForAuthenticatedUser,
  rejectInviteForAuthenticatedUser: rejectInviteForAuthenticatedUser,
  sendPendingInviteMails: sendPendingInviteMails,
  findUnusedInviteToTroupeForEmail: findUnusedInviteToTroupeForEmail
};