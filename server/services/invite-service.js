/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global require: true, module: true */
"use strict";

var assert                   = require("assert");
var uuid                     = require('node-uuid');
var winston                  = require("winston");
var Q                        = require("q");

var persistence              = require("./persistence-service");
var userService              = require("./user-service");
var troupeService            = require("./troupe-service");
var emailNotificationService = require("./email-notification-service");
var presenceService          = require("./presence-service");
var statsService             = require("../services/stats-service");
var appEvents                = require("../app-events");
var collections              = require("../utils/collections");
var mongoUtils               = require("../utils/mongo-utils");

/**
 * Like model.createQ, but invokes mongoose middleware
 */
function createQ(ModelType, options) {
  var m = new ModelType(options);
  return m.saveQ()
    .then(function() {
      return m;
    });
}

function createInviteQ(options) {
  // Track invite creation
  statsService.event('new_invite', {
    userId: options.fromUserId,
    toExistingUser: (options.email    ? false : true),
    oneToOne:       (options.troupeId ? false : true)
  });

  return createQ(persistence.Invite, options);
}


function createRequestQ(options) {
  return createQ(persistence.Request, options);
}

function createInviteUnconfirmedQ(options) {
  return createQ(persistence.InviteUnconfirmed, options);
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
    troupeService.findByIds(troupeIds),
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

        assert(fromUser, 'Could not find fromUser: ' + invite.fromUserId);
        assert(toUser, 'Could not find toUser. notifyRecipientsOfInvites only deals with existing user recipients, not email recipients');

        if(userIsOnline) {
          var text, uri;
          if(invite.troupeId && troupe) {
            text = "You've been invited to join the Troupe: " + troupe.name;
            uri = troupe.uri;
          } else if(!invite.troupeId && fromUser) {
            text = fromUser.displayName + " has invited you to connect";
            uri = fromUser.getHomeUri();
          }

          appEvents.userNotification({
            userId: toUserId,
            troupeId: troupe ? troupe.id : undefined,
            // TODO: add onetoone bits in to this invite
            title: "New Invitation",
            text: text,
            link: '/' + uri,
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
  assert(mongoUtils.isLikeObjectId(toUserId), 'toUserId must be an id');

  if(troupe) assert(!troupe.oneToOne, "Cannot invite members into oneToOne troupes");

  // Find the user
  return userService.findById(toUserId)
    .then(function(toUser) {
      assert(toUser, "toUserId " + toUser + " not found");

      var fromUserId = fromUser.id;
      assert(fromUserId, 'fromUser.id is missing');

      var chain = null;

      if(troupe) {
        // Never any chance of an implicit connection for troupe invites, just return false
        if(troupe.containsUserId(toUserId)) {
          // Since the troupe is not a oneToOne troupe, it's safe to reference it by it's URI
          chain = Q.resolve({ ignored: true, userId: toUserId });
        } else {
          chain = Q.resolve(null);
        }

      } else {
        // If this invite is for a onetoone and the users have an implicit connection
        // then simply connect them up and be done with it

        chain = troupeService.findImplicitConnectionBetweenUsers(fromUserId, toUserId)
          .then(function(hasImplicitConnection) {
            if(hasImplicitConnection) {
              return troupeService.findOrCreateOneToOneTroupeIfPossible(fromUserId, toUserId)
                .then(function(troupe) {
                  if(troupe) {
                    return { ignored: true, userId: toUserId, url: toUser.getHomeUrl() };
                  }
                });
            }

            return null;
          });
      }

      return chain.then(function(ignored) {
        if(ignored) return ignored; // No invite needed, ignoring the request

        var collection = fromUser.isConfirmed() ? persistence.Invite : persistence.InviteUnconfirmed;

        // Look for an existing invite
        var query = { status: 'UNUSED', userId: toUserId };
        if(!troupe) {
          query.fromUserId = fromUserId;
          query.troupeId = null;
        } else {
          query.troupeId = troupe.id;
        }

        var troupeId = troupe ? troupe.id : null;

        return collection.findOneQ(query)
          .then(function(existingInvite) {

            // Existing invite? Use it
            if (existingInvite) {
              return existingInvite;
            }

            var inviteData = {
                troupeId: troupeId,
                fromUserId: fromUserId,
                userId: toUserId,
                displayName: null, // Don't set this if we're using a userId
                email: null,       // Don't set this if we're using a userId
                code: toUser.isConfirmed() ? null : uuid.v4(),
                status: 'UNUSED'
              };

            return  fromUser.isConfirmed() ? createInviteQ(inviteData) : createInviteUnconfirmedQ(inviteData);

          }).then(function(invite) {

            // Notify the recipient, if the user is confirmed
            if(!fromUser.isConfirmed()) return invite;

            appEvents.newInvite({ fromUserId: fromUserId, inviteId: invite.id, toUserId: toUserId, troupeId: troupeId });

            return notifyRecipientsOfInvites([invite])
                    .then(function() {
                      return invite;
                    });
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
  assert(fromUser && fromUser.id, "fromUser expected");
  assert(email, "email expected");
  assert(!troupe || troupe.id, "troupe must have an id");

  // Only non-registered users should go through this flow.
  // Check if the email is registered to a user.
  return userService.findByEmail(email)
    .then(function(user) {

      if(user) {
        return inviteUserByUserId(troupe, fromUser, user.id);
      }

      var fromUserId = fromUser.id;

      var query = troupe ? { status: "UNUSED", troupeId: troupe.id, email: email }
                         : { status: "UNUSED", fromUserId: fromUser.id, email: email };

      return persistence.Invite.findOneQ(query)
          .then(function(existingInvite) {
            // Found an existing invite? Don't create a new one then
            if(existingInvite) return existingInvite;

            statsService.event('new_user_invite', { userId: fromUserId, invitedEmail: email, email: fromUser.email });

            // create the invite and send mail immediately

            return createInviteQ({
              troupeId: troupe && troupe.id,
              fromUserId: fromUserId,
              displayName: displayName,
              email: email,
              emailSentAt: Date.now(),
              code: uuid.v4()
            });

          }).then(function(invite) {
            appEvents.newInvite({ fromUserId: fromUserId, inviteId: invite.id, email: email });

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
function createInvite(troupe, options, callback) {

  return Q.resolve(null)
    .then(function() {

      assert(options.fromUser, 'fromUser required');
      assert(options.fromUser.id, 'fromUser.id required');

      if(options.userId) {
        return inviteUserByUserId(troupe, options.fromUser, options.userId);
      }

      if(options.email) {
        return inviteUserByEmail(troupe, options.fromUser, options.displayName, options.email);
      }

      throw "Invite needs an email or userId";
    }).nodeify(callback);
}

function findInviteForTroupeById(troupeId, inviteId, callback) {
  assert(mongoUtils.isLikeObjectId(troupeId), 'troupeId must be an id');
  assert(mongoUtils.isLikeObjectId(inviteId), 'inviteId must be an id');
  return persistence.Invite.findOneQ({ _id: inviteId, troupeId: troupeId })
    .nodeify(callback);
}


function findInviteForUserById(userId, inviteId, callback) {
  assert(mongoUtils.isLikeObjectId(userId), 'userId must be an id');
  assert(mongoUtils.isLikeObjectId(inviteId), 'inviteId must be an id');

  return persistence.Invite.findOneQ({ _id: inviteId, $or: [ { fromUserId: userId }, { userId: userId } ] })
    .nodeify(callback);
}


function findInviteByConfirmationCode(confirmationCode) {
  return persistence.Invite.findOneQ({ code: confirmationCode });
}

function findAllUnusedInvitesForTroupe(troupeId, callback) {
  assert(mongoUtils.isLikeObjectId(troupeId), 'id must be an id');

   return persistence.Invite.where('troupeId').equals(troupeId)
      .where('status').equals('UNUSED')
      .sort({ displayName: 'asc', email: 'asc' } )
      .execQ()
      .nodeify(callback);
}

function findUnusedInviteToTroupeForUserId(userId, troupeId, callback) {
  assert(mongoUtils.isLikeObjectId(userId), 'userId must be an id');
  assert(mongoUtils.isLikeObjectId(troupeId), 'troupeId must be an id');

  return persistence.Invite.findOneQ({ troupeId: troupeId, userId: userId, status: 'UNUSED' }).nodeify(callback);
}

/**
 * Find a new OR used invite
 * Returns a promise of { invite: unusedInvite, used: false } or nothing if the confirmation code is not found
 */
function findNewOrUsedInviteByConfirmationCode(confirmationCode) {
  assert(confirmationCode, 'confirmationCode required');
  return Q.all([
      persistence.Invite.findOneQ({ code: confirmationCode }),
      persistence.InviteUsed.findOneQ({ code: confirmationCode })
    ])
    .spread(function(unusedInvite, usedInvite) {
      console.log('FOUND ', arguments);
      if(unusedInvite) {
        return { invite: unusedInvite, used: false };
      }

      if(usedInvite) {
        return { invite: usedInvite, used: true };
      }

      return;
    });
}


/**
 * Update invites and requests, moving them from an email address to a userId.
 *
 * Also moves requests and invites from UNCONFIRMED collections
 *
 * @returns a promise of nothing
 */
function updateInvitesAndRequestsForConfirmedEmail(email, userId) {
  assert(email, 'email required');
  assert(userId, 'userId required');

  return troupeService.findAllTroupesForUser(userId)
    .then(function(troupes) {
      return troupeService.indexTroupesByUserIdTroupeId(troupes, userId);
    })
    .then(function(indexedHash) {
      /*******************************************/
      /** Step 1: updateInvitesForEmailToUserId **/
      /*******************************************/

      return persistence.Invite.findQ({ email: email })
        .then(function(invites) {
          winston.verbose('Updating ' + invites.length + ' invites from ' + email + ' to userId ' + userId);
          if(!invites.length) return;

          return Q.all(invites.map(function(invite) {
              if(invite.troupeId) {
                // This is an invite to join a troupe
                if(indexedHash.groupTroupeIds[invite.troupeId]) {
                  winston.info('Trashing invite as user is already in the troupe');

                  // Already a member of the group? Delete the invite
                  return invite.removeQ();
                }
              } else {
                if(indexedHash.oneToOne[invite.fromUserId]) {
                  winston.info('Trashing invite as user is already connected');

                  // Already connect to the inviter? Delete the invite
                  return invite.removeQ();
                }
              }

              invite.email = null;
              invite.displayName = null;
              invite.userId = userId;
              return invite.saveQ();
            }));
        })
        .thenResolve(indexedHash);
    })
    .then(function(indexedHash) {
      /**
       * Find all unconfirmed invites for a recently confirmed user, notify recipients
       */
      return persistence.InviteUnconfirmed.findQ({ fromUserId: userId })
          .then(function(invites) {
            winston.info('Creating ' + invites.length + ' invites for recently confirmed user ' + userId);

            var invitesForNotification = [];

            var promises = invites.map(function(invite) {
              if(invite.troupeId) {
                // This is an invite to join a troupe
                if(indexedHash.groupTroupeIds[invite.troupeId]) {
                  winston.info('Trashing invite as user is already in the troupe');

                  // Already a member of the group? Delete the invite
                  return invite.removeQ();
                }
              } else {
                if(indexedHash.oneToOne[invite.fromUserId]) {
                  winston.info('Trashing invite as user is already connected');

                  // Already connect to the inviter? Delete the invite
                  return invite.removeQ();
                }
              }

              return createInviteQ(invite)
                .then(function(newInvite) {
                  appEvents.newInvite({ fromUserId: userId, inviteId: newInvite.id, toUserId: newInvite.userId });

                  return invite.removeQ()
                    .then(function() {
                      invitesForNotification.push(newInvite);
                      return newInvite;
                    });
                  });
            });

            // After we're done saving the invites
            return Q.all(promises)
              .then(function() {
                return notifyRecipientsOfInvites(invitesForNotification);
              });
          })
          .thenResolve(indexedHash);
    })
    .then(function(indexedHash) {
      /**
       * Find all unconfirmed requests for a recently confirmed user
       */
      return persistence.RequestUnconfirmed.findQ({ userId: userId })
        .then(function(requests) {
          winston.verbose('Updating ' + requests.length + ' requests for userId ' + userId);
          if(!requests.length) {
            return;
          }

          winston.info('Creating ' + requests.length + ' requests for recently confirmed user ' + userId);

          var promises = requests.map(function(request) {
            if(indexedHash.groupTroupeIds[request.troupeId]) {
              winston.info('Trashing request user is already in the troupe');

              // Already a member of the group? Delete the invite
              return request.removeQ();
            }

            // Otherwise, move the request from unconfirmed to confirmed
            return createRequestQ(request)
              .then(function() {
                return request.removeQ();
              });
          });

          return Q.all(promises);
        });
    });

}

function findAllUsedInvitesForUserId(userId, callback) {
  assert(mongoUtils.isLikeObjectId(userId), 'userId must be an id');

  return persistence.InviteUsed.where('userId').equals(userId)
    .sort({ createdAt: 'asc' } )
    .execQ()
    .nodeify(callback);
}


function findAllUnusedInvitesForUserId(userId, callback) {
  assert(mongoUtils.isLikeObjectId(userId), 'userId must be an id');

  return persistence.Invite.where('userId').equals(userId)
    .where('status').equals('UNUSED')
    .sort({ createdAt: 'asc' } )
    .execQ()
    .nodeify(callback);
}


function findAllUnusedInvitesFromUserId(userId, callback) {
  assert(mongoUtils.isLikeObjectId(userId), 'userId must be an id');

  return persistence.Invite.where('fromUserId').equals(userId)
    .sort({ createdAt: 'asc' } )
    .execQ()
    .nodeify(callback);
}

function findAllUsedInvitesFromUserId(userId, callback) {
  assert(mongoUtils.isLikeObjectId(userId), 'userId must be an id');

  return persistence.InviteUsed.where('fromUserId').equals(userId)
    .sort({ createdAt: 'asc' } )
    .execQ()
    .nodeify(callback);
}


function findAllUnusedConnectionInvitesFromUserId(userId, callback) {
  assert(mongoUtils.isLikeObjectId(userId), 'userId must be an id');

  return persistence.Invite.where('fromUserId').equals(userId)
    .where('troupeId').equals(null)
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

function sendPendingInviteMails(delaySeconds, callback) {
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
        troupeService.findByIds(troupeIds),
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

/************************************************************************/
/* Invite Acceptance                                                    */
/************************************************************************/


/**
 * markInviteUsedAndDeleteAllSimilarOutstandingInvites: pretty self explainatory I think
 * @return promise of the number of additional invites removed
 */
function markInviteUsedAndDeleteAllSimilarOutstandingInvites(invite) {
  assert(invite);

  invite.status = 'USED';

  return createQ(persistence.InviteUsed, invite)
    .then(function() {
      return invite.removeQ()
          .then(function() {

            var similarityQuery = { status: 'UNUSED', userId: invite.userId, email: invite.email };
            if(invite.troupeId) {
              similarityQuery.troupeId = invite.troupeId;
            } else {
              similarityQuery.fromUserId = invite.fromUserId;
              similarityQuery.troupeId = null; // Important to signify that its a one-to-one invite
            }

            return persistence.Invite.findQ(similarityQuery)
              .then(function(invalidInvites) {
                if(!invalidInvites.length) return 0;

                // Delete the invalid invites
                var promises = invalidInvites.map(function(invalidInvite) {
                  invalidInvite.status = 'INVALID';

                  return createQ(persistence.InviteUsed, invalidInvite)
                          .then(function() {
                            return invalidInvite.removeQ();
                          });

                });

                return Q.all(promises).thenResolve(promises.length);
              });

          });
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

// Accept an invite, must not be used for requests from a logged in user, returns callback(err, user, alreadyExists)
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
      if(!invite || invite.status !== 'UNUSED' /* TODO remove this term later */) {
        return persistence.InviteUsed.findOneQ({ code: confirmationCode })
          .then(function(usedInvite) {
            if(!usedInvite) {
              winston.error("Invite confirmationCode=" + confirmationCode + " not found. ");
              return { user: null };
            }

            return findRecipientForInvite(usedInvite)
              .then(function(user) {

                /* The invite has already been used. We need to fail authentication (if they have completed their profile), but go to the troupe */
                winston.verbose("Invite has already been used", { confirmationCode: confirmationCode, troupeUri: troupeUri });
                statsService.event('invite_reused', { userId: user && user.id, uri: troupeUri, confirmationCode: confirmationCode });

                // If the user has clicked on the invite, but hasn't completed their profile (as in does not have a password)
                // then we'll give them a special dispensation and allow them to access the site (otherwise they'll never get in)
                if (user && user.status == 'PROFILE_NOT_COMPLETED') {
                  return { user: user };
                }

                return { user: null, alreadyUsed: true };
              });

          });
      }

      return findRecipientForInvite(invite)
        .then(function(user) {

          // If the user doesn't exist and the invite is not used,
          // create the user
          //
          // TODO: in future, once the USED invites are out of the collection the
          // status term in the if below can be removed
          if(!user) {
            return userService.findOrCreateUserForEmail({
              email: invite.email,
              status: "PROFILE_NOT_COMPLETED",
              source: 'invite_accept'
            });
          }

          return user;
        })
        .then(function(user) {
          var email = invite.email || user.email;

          return updateInvitesAndRequestsForConfirmedEmail(email, user.id)
            .thenResolve(user);
        })
        .then(function(user) {
          // Invite is good to accept

          statsService.event('invite_accepted', { userId: user.id, email: user.email, uri: troupeUri, new_user: user.status !== 'ACTIVE' });
          winston.verbose("Invite accepted", { confirmationCode: confirmationCode, troupeUri: troupeUri });

          var confirmOperation = null;
          // confirm the user if they are not already.
          if (user.status == 'UNCONFIRMED') {
            user.status = 'PROFILE_NOT_COMPLETED';
            confirmOperation = user.saveQ();
          }

          var isNormalTroupe = !!invite.troupeId;
          return Q.all([
              confirmOperation,
              isNormalTroupe ? troupeService.addUserIdToTroupe(user.id, invite.troupeId) :
                               troupeService.findOrCreateOneToOneTroupe(user.id, invite.fromUserId)
            ])
            .spread(function(userSaveResult, troupe) {
              // once user is added / troupe is created, send email notice
              sendInviteAcceptedNotice(invite, troupe, isNormalTroupe);

              return markInviteUsedAndDeleteAllSimilarOutstandingInvites(invite)
                .then(function() {
                  return troupeService.getUrlForTroupeForUserId(troupe, user.id).then(function(url) {
                    return { user: user, url: url };
                  });
                });
            });

        });

    })
    .nodeify(callback);
}

function sendInviteAcceptedNotice(invite, troupe, isNormalTroupe) {
  assert(invite); assert(troupe);

  if (isNormalTroupe)
    return; // we don't send notices for invite acceptances to normal troupes

  var findTroupe = troupeService.getUrlForTroupeForUserId(troupe, invite.fromUserId);
  var findFromUser = userService.findById(invite.fromUserId);
  var findToUser = userService.findById(invite.userId);

  Q.spread([findFromUser, findToUser, findTroupe], function(fromUser, toUser, troupeUri) {

    if (fromUser && troupeUri) {
      emailNotificationService.sendConnectAcceptanceToUser(fromUser, toUser, troupeUri);
    } else {
      winston.info("Couldn't lookup invite sender to send acceptance notice to");
    }
  });
}

/**
 * Accept an invite to a one to one connection or a troupe
 * @return the promise of a troupe
 */
function acceptInviteForAuthenticatedUser(user, invite) {
  return Q.resolve(null)
    .then(function() {
      assert(user, 'User parameter required');
      assert(invite, 'invite parameter required');

      // check if the invite is associated with this user id
      // check if the invited email is owned by the user
      if (invite.userId != user.id && !user.hasEmail(invite.email)) {

        // associate this email address as a confirmed secondary address for the user
        return userService.addSecondaryEmail(user, invite.email, true)
          .then(function() {
            return userService.confirmSecondaryEmailByAddress(user, invite.email);
          });
      }
    })
    .then(function() {
      // note: the invite is not actually owned by this user yet as that happens async after confirm
      // TODO: this will not be used in future once invites are all delete
      if(invite.status !== 'UNUSED') {
        // invite has been used, we can't use it again.
        winston.verbose("Invite has already been used", { inviteId: invite.id });
        statsService.event('invite_reused', { userId: user.id, inviteId: invite.id });

        throw { alreadyUsed: true };
      }

      // use and delete invite
      statsService.event('invite_accepted', { userId: user.id, email: user.email, inviteId: invite.id, new_user: user.status !== 'ACTIVE' });
      winston.verbose("Invite accepted for authd user", { inviteId: invite.id, inviteFromUserId: invite.fromUserId });

      // Either add the user or create a one to one troupe. depending on whether this
      // is a one to one invite or a troupe invite
      if(!!invite.troupeId) {
        return troupeService.addUserIdToTroupe(user.id, invite.troupeId);
      } else {
        return troupeService.findOrCreateOneToOneTroupe(invite.fromUserId, user.id)
          .then(function(troupe) {
            return troupe;
          });
      }
    })
    .then(function(troupe) {
      // once user is added / troupe is created, send email notice
      sendInviteAcceptedNotice(invite, troupe, /* group troupe */ !troupe.oneToOne);

      // Regardless of the type, mark things as done
      return markInviteUsedAndDeleteAllSimilarOutstandingInvites(invite)
        .thenResolve(troupe);
    });

}


// so that the invite doesn't show up in the receiver's list of pending invitations
// marks the invite as used
function rejectInviteForAuthenticatedUser(user, invite) {
  return Q.resolve(null).then(function() {
    assert(user, 'User parameter required');
    assert(invite, 'invite parameter required');


    if(invite.email !== user.email && invite.userId != user.id) {
      throw 401;
    }

    statsService.event('invite_rejected', { userId: user.id, inviteId: invite.id });
    winston.verbose("Invite rejected", { inviteId: invite.id });

    return markInviteUsedAndDeleteAllSimilarOutstandingInvites(invite);
  });
}

/************************************************************************/
/* Event Handling                                                       */
/************************************************************************/

appEvents.onEmailConfirmed(function(params) {
  winston.info("Email address confirmed, updating invites and requests", params);
  var email = params.email;
  var userId = params.userId;

  return updateInvitesAndRequestsForConfirmedEmail(email, userId);
});

appEvents.onTroupeDeleted(function(troupeId) {
  winston.info("Troupe deleted, removing invites", troupeId);

  return findAllUnusedInvitesForTroupe(troupeId)
    .then(function(invites) {
      return Q.all(invites.map(function(invite) {
        return invite.removeQ();
      }));
    });
});


module.exports = {
  createInvite: createInvite,
  findInviteForTroupeById: findInviteForTroupeById,
  findInviteForUserById: findInviteForUserById,
  findInviteByConfirmationCode: findInviteByConfirmationCode,
  findAllUnusedInvitesForTroupe: findAllUnusedInvitesForTroupe,
  findAllUnusedInvitesForEmail: findAllUnusedInvitesForEmail,
  findAllUnusedInvitesForUserId: findAllUnusedInvitesForUserId,
  findAllUsedInvitesForUserId: findAllUsedInvitesForUserId,
  findAllUsedInvitesFromUserId: findAllUsedInvitesFromUserId,
  findAllUnusedInvitesFromUserId: findAllUnusedInvitesFromUserId,
  findAllUnusedConnectionInvitesFromUserId: findAllUnusedConnectionInvitesFromUserId,
  findUnusedInviteToTroupeForUserId: findUnusedInviteToTroupeForUserId,
  findNewOrUsedInviteByConfirmationCode: findNewOrUsedInviteByConfirmationCode,
  inviteUserByUserId: inviteUserByUserId,

  updateInvitesAndRequestsForConfirmedEmail: updateInvitesAndRequestsForConfirmedEmail,
  sendPendingInviteMails: sendPendingInviteMails,

  /* Invite Acceptance */
  acceptInvite: acceptInvite,
  acceptInviteForAuthenticatedUser: acceptInviteForAuthenticatedUser,
  rejectInviteForAuthenticatedUser: rejectInviteForAuthenticatedUser,

  testOnly: {
    markInviteUsedAndDeleteAllSimilarOutstandingInvites: markInviteUsedAndDeleteAllSimilarOutstandingInvites
  }

};
