'use strict';

var Promise = require('bluebird');
var TroupeInvite = require('gitter-web-persistence').TroupeInvite;
var uuid = require('node-uuid');
var assert = require('assert');
var StatusError = require('statuserror');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

function createInvite(roomId, options) {
  var type = options.type;
  var externalId = options.externalId;
  var invitedByUserId = options.invitedByUserId;
  var emailAddress = options.emailAddress;

  externalId = externalId.toLowerCase();
  var secret = uuid.v4();
  return TroupeInvite.create({
      troupeId: roomId,
      type: type,
      externalId: externalId,
      emailAddress: emailAddress,
      userId: null,
      secret: secret,
      invitedByUserId: invitedByUserId,
      state: 'PENDING'
    })
    .catch(mongoUtils.mongoErrorWithCode(11000), function() {
      throw new StatusError(409); // Conflict
    });
}

function associateSecretWithUser(secret, userId) {
  assert(secret);
  return TroupeInvite.findOne({ secret: secret })
    .lean()
    .exec()
    .bind({
      externalId: null,
      type: null
    })
    .then(function(invite) {
      if (!invite) throw new StatusError(404);
      var type = this.type = invite.type;
      var externalId = this.externalId = invite.externalId;

      return TroupeInvite.find({ type: type, externalId: externalId, state: 'PENDING', userId: null })
        .lean()
        .exec();
    })
    .then(function(invites) {
      if (!invites || !invites.length) return;

      var inviteIds = invites.map(function(i) {
        return i._id;
      });

      return TroupeInvite.update({
          _id: { $in: inviteIds },
          type: this.type,
          externalId: this.externalId,
          state: 'PENDING',
          userId: null
        }, {
          $set: {
            userId: userId
          }
        }, {
          multi: true
        })
        .return(invites);
    })
}

module.exports = {
  createInvite: Promise.method(createInvite),
  associateSecretWithUser: Promise.method(associateSecretWithUser)
}
