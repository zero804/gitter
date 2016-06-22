'use strict';

var invitesService = require('gitter-web-invites/lib/invites-service');
var Promise = require('bluebird');
var isValidEmail = require('email-validator').validate;
var StatusError = require('statuserror');
var GitHubUserEmailAddressService = require('gitter-web-github').GitHubUserEmailAddressService;
var emailNotificationService = require('./email-notification-service');
var roomService = require('./room-service');
var identityService = require('gitter-web-identity');
var userService = require('./user-service');

var GITTER_IDENTITY_TYPE = 'gitter';
var GITHUB_IDENTITY_PROVIDER = identityService.GITHUB_IDENTITY_PROVIDER;

function findExistingGitterUser(username) {
  return userService.findByUsername(username);
}

function findExistingIdentityUsername(provider, username) {
  return identityService.findUserIdForProviderUsername(provider, username)
    .then(function(userId) {
      if (!userId) return;
      return userService.findById(userId);
    })
}

function findExistingUser(type, externalId) {
  switch(type) {
    case GITTER_IDENTITY_TYPE:
      return findExistingGitterUser(externalId);

    case GITHUB_IDENTITY_PROVIDER:
      // TODO: Note that we will need to do a lookup once
      // splitville is complete and gitter usernames <> github usernames
      return findExistingGitterUser(externalId);
  }

  return findExistingIdentityUsername(type, externalId);
}

/**
 * @private
 */
function resolveGitHubUserEmail(invitingUser, githubUsername) {
  var githubUserEmailAddressService = new GitHubUserEmailAddressService(invitingUser);
  return githubUserEmailAddressService.findEmailAddressForGitHubUser(githubUsername);
}

/**
 * @private
 */
function resolveEmailAddress(invitingUser, type, externalId) {
  // For now, we only try resolve email addresses for GitHub users
  if (type === GITHUB_IDENTITY_PROVIDER) {
    return resolveGitHubUserEmail(invitingUser, externalId);
  }

  return null;
}

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
      return resolveEmailAddress(invitingUser, type, externalId);
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
  return findExistingUser(type, externalId)
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
