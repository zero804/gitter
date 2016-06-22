'use strict';

var invitesService = require('gitter-web-invites/lib/invites-service');
var Promise = require('bluebird');
var isValidEmail = require('email-validator').validate;
var StatusError = require('statuserror');
var GitHubUserEmailAddressService = require('gitter-web-github').GitHubUserEmailAddressService;
var emailNotificationService = require('./email-notification-service');

function resolveGitHubUserEmail(invitingUser, githubUsername) {
  var githubUserEmailAddressService = new GitHubUserEmailAddressService(invitingUser);
  return githubUserEmailAddressService.findEmailAddressForGitHubUser(githubUsername);
}

function resolveEmailAddress(invitingUser, type, externalId) {
  if (type === 'GITHUB') {
    return resolveGitHubUserEmail(invitingUser, externalId);
  }

  return null;
}

function createInvite(room, invitingUser, options) {
  var type = options.type;
  var externalId = options.externalId;
  var emailAddress = options.emailAddress;

  return Promise.try(function() {
      if (emailAddress) {
        if (!isValidEmail(emailAddress)) {
          throw new StatusError(400);
        }

        return emailAddress;
      }

      return resolveEmailAddress(invitingUser, type, externalId);
    })
    .bind({
      email: null
    })
    .then(function(resolvedEmailAddress) {
      return invitesService.createInvite(room._id, {
          type: type,
          externalId: externalId,
          emailAddress: resolvedEmailAddress,
          invitedByUserId: invitingUser._id
        });
    })
    .then(function(invite) {
      return emailNotificationService.sendInvitation(invitingUser, invite, room);
    })
    .return(undefined);
}

module.exports = {
  createInvite: Promise.method(createInvite)
}
