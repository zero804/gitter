'use strict';

var env = require('gitter-web-env');
var logger = env.logger;

var RoomWithPolicyService = require('./room-with-policy-service');
var troupeService = require('./troupe-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var invitesService = require('gitter-web-invites/lib/invites-service');
var StatusError = require('statuserror');
var assert = require('assert');
var Promise = require('bluebird');

/**
 * Accepts an invitation and return the room the user has just joined
 */
function acceptInvite(user, secret) {
  assert(user);

  return invitesService.accept(user._id, secret)
    .bind({
      invite: null,
      room: null
    })
    .then(function(invite) {
      if (!invite) throw new StatusError(404);
      this.invite = invite;
      var troupeId = invite.troupeId;
      return troupeService.findById(troupeId);
    })
    .then(function(room) {
      if (!room) throw new StatusError(404);
      this.room = room;
      return policyFactory.createPolicyForRoom(user, room);
    })
    .then(function(policy) {
      var roomWithPolicyService = new RoomWithPolicyService(this.room, user, policy);
      return roomWithPolicyService.joinRoom();
    })
    .then(function() {
      return invitesService.markInviteAccepted(this.invite._id, user._id)
        .return(this.room);
    })
    .catch(StatusError, function(err) {
      if (err.status >= 500) throw err;

      logger.error('Invitation accept failed', { exception: err });

      if (this.invite) {
        return invitesService.markInviteRejected(this.invite._id, user._id)
          .throw(err);
      }

      throw err;
    });
}

module.exports = {
  acceptInvite: Promise.method(acceptInvite)
};
