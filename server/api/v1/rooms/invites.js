"use strict";

var troupeService = require('../../../services/troupe-service');
var RoomWithPolicyService = require('../../../services/room-with-policy-service');
var StatusError = require('statuserror');
var identityService = require('gitter-web-identity');
var restSerializer = require("../../../serializers/rest-serializer");

/**
 * Hide the resolved email address from the caller
 */
function maskEmail(email) {
  return email
    .split('@')
    .map(function (item, index) {
      if (index === 0) {
        var gmailMagic = item.split('+')[0];
        return gmailMagic.slice(0, -8) + '****';
      }
      return item;
    })
    .join('@');
}

function validateIsString(value) {
  if (value && typeof value !== 'string') {
    throw new StatusError(400);
  }

  return value;
}

function parseAndValidateBody(body) {
  var types = {};

  function addUserIdentifer(identifier, key) {
    var value = body[key];
    if (!value) return;

    if (typeof value !== 'string') {
      throw new StatusError(400);
    }

    types[identifier] = value;
  }

  addUserIdentifer('gitter', 'username');
  addUserIdentifer(identityService.GITHUB_IDENTITY_PROVIDER, 'githubUsername');
  addUserIdentifer(identityService.TWITTER_IDENTITY_PROVIDER, 'twitterUsername');

  var emailAddress = validateIsString(body.email);

  var keys = Object.keys(types);

  // You can't specify more than one external username
  if (keys.length > 1) throw new StatusError(400);

  var type, externalId;

  if (keys.length) {
    // Provided the username from an external service, and
    // optionally an email address
    type = keys[0];
    externalId = types[type];
  } else {
    // No external username provided. Use
    if (!emailAddress) throw new StatusError(400);
    type = 'email';
    externalId = emailAddress;
  }

  return {
    type: type,
    externalId: externalId,
    emailAddress: emailAddress
  }
}

module.exports = {
  id: 'roomInvite',

  create: function(req) {
    var input = parseAndValidateBody(req.body);

    return troupeService.findById(req.params.troupeId)
      .then(function(troupe) {
        var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
        return roomWithPolicyService.createRoomInvitation(input.type, input.externalId, input.emailAddress);
      })
      .then(function(result) {
        if (!input.emailAddress && result.emailAddress) {
          result.emailAddress = maskEmail(result.emailAddress);
        }

        if (!result.user) {
          return {
            status: result.status,
            email: result.emailAddress
          }
        }

        var strategy = new restSerializer.UserStrategy();
        return restSerializer.serializeObject(result.user, strategy)
          .then(function(serializedUser) {
            return {
              status: result.status,
              email: result.emailAddress,
              user: serializedUser
            }
          });
      })
  },
};
