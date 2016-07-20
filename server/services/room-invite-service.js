'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var isValidEmail = require('email-validator').validate;
var StatusError = require('statuserror');
var emailNotificationService = require('./email-notification-service');
var roomService = require('./room-service');
var invitesService = require('gitter-web-invites/lib/invites-service');


/**
 * @private
 */
function addUserToRoomInsteadOfInvite(room, invitingUser, userToInvite) {
  return roomService.addUserToRoom(room, invitingUser, userToInvite)
}

/**
 * @private
 */
function createInviteForNewUser(room, invitingUser, type, externalId, emailAddress) {
  return Promise.try(function() {
      // If an email address is provided, assert that its valid
      // and use it
      if (emailAddress) {
        if (!isValidEmail(emailAddress)) {
          throw new StatusError(400);
        }

        return emailAddress;
      }

      // No email address was provided, attempt to
      // sniff out the email address given the external username and type
      return invitesService.resolveEmailAddress(invitingUser, type, externalId);
    })
    .bind({
      email: null
    })
    .then(function(resolvedEmailAddress) {
      // The client needs to submit the request with an email address
      if (!resolvedEmailAddress) throw new StatusError(428);

      return invitesService.createInvite(room._id, {
          type: type,
          externalId: externalId,
          emailAddress: resolvedEmailAddress,
          invitedByUserId: invitingUser._id
        });
    })
    .tap(function(invite) {
      stats.event("new_invite", {
        userId: invitingUser && (invitingUser.id || invitingUser._id),
        troupeId: room && (room.id || room._id),
        type: type,
        uri: room && room.uri
      });

      return emailNotificationService.sendInvitation(invitingUser, invite, room);
    })
    .then(function(invite) {
      return invite.emailAddress;
    });

}

/**
 * @return {
 *           status: 'added'/'invited'
 *           emailAddress: '...'        // When the user has been invited
 *           user: '...'                // When the user was added
 *         }
 * @throws HTTP 428 (email address required)
 */
function createInvite(room, invitingUser, options) {
  var type = options.type;
  var externalId = options.externalId;
  var emailAddress = options.emailAddress;

  // Firstly, try figure out whether this user is already on gitter.
  return invitesService.findExistingUser(type, externalId)
    .then(function(userToInvite) {
      if (userToInvite) {
        // The user already exists!
        // Rather than inviting them, we'll add them
        // immediately (for now)
        return addUserToRoomInsteadOfInvite(room, invitingUser, userToInvite)
          .then(function() {
            return {
              status: 'added',
              user: userToInvite
            };
          })
      } else {
        // The user doesn't exist. We'll try invite them
        return createInviteForNewUser(room, invitingUser, type, externalId, emailAddress)
          .then(function(resolvedEmailAddress) {
            return {
              status: 'invited',
              emailAddress: resolvedEmailAddress
            };
          });
      }
    });
}

module.exports = {
  createInvite: Promise.method(createInvite)
}
