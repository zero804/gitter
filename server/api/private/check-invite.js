'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');
var isValidEmail = require('email-validator').validate;
var inviteValidation = require('gitter-web-invites/lib/invite-validation');
var invitesService = require('gitter-web-invites/lib/invites-service');
var restSerializer = require("../../serializers/rest-serializer");


function _findEmailAddress(invitingUser, type, externalId, emailAddress) {
  if (emailAddress) {
    if (!isValidEmail(emailAddress)) {
      throw new StatusError(400);
    }

    return emailAddress;
  }

  return invitesService.resolveEmailAddress(invitingUser, type, externalId);
}

var findEmailAddress = Promise.method(_findEmailAddress);

function findInvitationInfo(invitingUser, type, externalId, emailAddress) {
  var userToInvite;
  return invitesService.findExistingUser(type, externalId)
    .then(function(_userToInvite) {
      userToInvite = _userToInvite;
      return findEmailAddress(invitingUser, type, externalId, emailAddress)
    })
    .then(function(resolvedEmailAddress) {
      if (!resolvedEmailAddress) throw new StatusError(428);

      return {
        user: userToInvite, // can be null/undefined
        displayName: userToInvite && userToInvite.displayName || externalId,
        emailAddress: resolvedEmailAddress,
        avatarUrl: inviteValidation.getAvatar(type, externalId, resolvedEmailAddress)
      };
    });
}

function checkInvite(req, res, next) {
  var input = inviteValidation.parseAndValidateInput(req.query);
  return findInvitationInfo(req.user, input.type, input.externalId, input.emailAddress)
    .then(function(result) {
      if (!input.emailAddress && result.emailAddress) {
        result.emailAddress = inviteValidation.maskEmail(result.emailAddress);
      }

      if (!result.user) {
        return {
          displayName: result.displayName,
          email: result.emailAddress,
          avatarUrl: result.avatarUrl
        }
      }

      var strategy = new restSerializer.UserStrategy();
      return restSerializer.serializeObject(result.user, strategy)
        .then(function(serializedUser) {
          return {
            user: serializedUser,
            displayName: result.displayName,
            email: result.emailAddress,
            avatarUrl: result.avatarUrl
          }
        });
    });
}


module.exports = checkInvite;




