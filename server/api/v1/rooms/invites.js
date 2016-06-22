"use strict";

var troupeService = require('../../../services/troupe-service');
var RoomWithPolicyService = require('../../../services/room-with-policy-service');
var _ = require('lodash');
var StatusError = require('statuserror');

function validateIsString(value) {
  if (value && typeof value !== 'string') {
    throw new StatusError(400);
  }

  return value;
}

function parseAndValidateBody(body) {
  var types = _.omitBy({
    // 'GITTER': validateIsString(body.gitterUsername), // TODO: add invites for internal users
    'GITHUB': validateIsString(body.githubUsername),
    'TWITTER': validateIsString(body.twitterUsername),
  });

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
    type = 'EMAIL';
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
      });
  },
};
