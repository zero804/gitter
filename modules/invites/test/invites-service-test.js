'use strict';

var invitesService = require('../lib/invites-service');
var ObjectID = require('mongodb').ObjectID;
var assert = require('assert');
var StatusError = require('statuserror');

describe('invite-service', function() {
  describe('integration tests #slow', function() {

    describe('createInvite', function() {

      it('should create an invite', function() {
        var roomId = new ObjectID();
        var invitedBy = new ObjectID();

        return invitesService.createInvite(roomId, {
            type: 'GITHUB',
            externalId: 'gitterawesome',
            invitedByUserId: invitedBy,
            emailAddress: 'test@gitter.im'
          })
          .then(function(invite) {
            assert.strictEqual(invite.state, 'PENDING');
            assert.strictEqual(String(invite.invitedByUserId), String(invitedBy));
            assert.strictEqual(String(invite.troupeId), String(roomId));
            assert.strictEqual(invite.userId, null);
            assert.strictEqual(invite.emailAddress, 'test@gitter.im');
            assert.strictEqual(invite.externalId, 'gitterawesome');
            assert.strictEqual(invite.type, 'GITHUB');
          });
      });

      it('should not allow duplicate invites', function() {
        var roomId = new ObjectID();
        var invitedBy = new ObjectID();

        return invitesService.createInvite(roomId, {
            type: 'GITHUB',
            externalId: 'gitterawesome',
            invitedByUserId: invitedBy,
            emailAddress: 'test@gitter.im'
          })
          .then(function() {
            return invitesService.createInvite(roomId, {
                type: 'GITHUB',
                externalId: 'gitterawesome',
                invitedByUserId: invitedBy,
                emailAddress: 'test@gitter.im'
              });
          })
          .then(function() {
            assert.ok(false, 'Expected exception');
          })
          .catch(StatusError, function(err) {
            assert(err.status, 419);
          })
      });
    });

    describe('associateSecretWithUser', function() {});

  });
});
