"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');
var Promise = require('bluebird');
var testGenerator = require('../../test-generator');

var mockito = require('jsmockito').JsMockito;


describe('authorisor', function() {
  describe('incoming', function() {

    // All of our fixtures
    var FIXTURES = [{
      name: 'Subscribe, socket does not exist',
      meta: {
        socketExists: false,
        clientId: 'y',
        expectedError: true
      }
    },{
      name: 'socket exists',
      meta: {
        socketExists: true,
        clientId: 'x',
        userId: '53d8a945451e506ad636c9ba'
      },
      tests: [{
        name: 'room subscription',
        meta: {
          troupeId: '53d8a7145be4af565d856e6e',
          subscription: "/api/v1/rooms/53d8a7145be4af565d856e6e"
        },
        tests: [{
          name: 'has access',
          canAccessRoom: true
        },{
          name: 'has no access',
          canAccessRoom: false,
          expectedError: true
        }]
      }, {
        name: 'user subscription (own userId)',
        meta: {
          subscription: "/api/v1/user/53d8a945451e506ad636c9ba"
        }
      },{
        name: 'user subscription (another userId)',
        meta: {
          subscription: "/api/v1/user/53d8aa12d795e2ab8be23550", // different
          expectedError: true // Access denied
        }
      }]
    },];

    testGenerator(FIXTURES, function(name, meta) {

      var presenceServiceMock = mockito.mock(testRequire('gitter-web-presence'));
      var restfulMock = mockito.mock(testRequire('./services/restful'));
      var createPolicyForUserIdInRoomId = mockito.mockFunction();

      mockito.when(createPolicyForUserIdInRoomId)().then(function(userId, roomId) {
        if(meta.canAccessRoom !== true && meta.canAccessRoom !== false) {
          assert(false, 'Unexpected call to canAccessRoom');
        }

        assert.equal(userId, meta.userId);
        assert.equal(roomId, meta.troupeId);

        return Promise.resolve({
          canRead: function() {
            return Promise.resolve(!!meta.canAccessRoom);
          }
        })
      });

      var authorisor = testRequire.withProxies("./web/bayeux/authorisor", {
        'gitter-web-permissions/lib/policy-factory': {
          createPolicyForUserIdInRoomId: createPolicyForUserIdInRoomId
        },
        'gitter-web-presence': presenceServiceMock,
        '../../services/restful': restfulMock
      });

      it(name, function(done) {
        var message = {
          channel: '/meta/subscribe',
          clientId: meta.clientId,
          subscription: meta.subscription
        };

        mockito.when(presenceServiceMock).lookupUserIdForSocket()
          .then(function(clientId) {
            assert.equal(clientId, meta.clientId);
            if(!meta.socketExists) return Promise.resolve([null, false]);

            return Promise.resolve([meta.userId, true]);
          });

        authorisor.incoming(message, null, function(message) {
          if(meta.expectedError) {
            assert(!!message.error, "Expected an error");
            done();
          } else {
            done(message.error);
          }
        });

      });

    });
  });

});
