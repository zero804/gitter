"use strict";

var assert = require('assert');
var fixtureLoader = require('../../../test/integration/test-fixtures');

var securityDesciptorService = require('../lib/security-descriptor-service');

describe('security-descriptor-service', function() {
  describe('integration tests #slow', function() {

    var fixture = {};
    before(fixtureLoader(fixture, {
      user1: {},
      user2: {},
      user3: {},
      troupe1: {
        users: ['user1'],
        securityDescriptor: {
          type: null,
          members: 'PUBLIC',
          admins: 'MANUAL',
          public: true,
          linkPath: 'gitterHQ/gitter',
          externalId: null,
          extraMembers: ['user1'],
          extraAdmins: ['user1', 'user3']
        }
      },
      troupe2: {
        users: ['user1'],
        securityDescriptor: {
          type: null,
          members: 'INVITE',
          admins: 'MANUAL',
          public: true,
          linkPath: 'gitterHQ/gitter',
          externalId: null,
          extraMembers: [],
          extraAdmins: []
        }
      }
    }));

    after(function() { fixture.cleanup(); });

    describe('getForRoomUser', function() {
      it('should load all the fields', function() {
        var userId = fixture.user1._id;
        var roomId = fixture.troupe1._id;

        return securityDesciptorService.getForRoomUser(roomId, userId)
          .then(function(perms) {
            assert.deepEqual(perms, {
              admins: "MANUAL",
              externalId: null,
              linkPath: "gitterHQ/gitter",
              members: "PUBLIC",
              public: true,
              type: null,
              extraMembers: [userId],
              extraAdmins: [userId]
            });
          });
      });

    });

  });
});
