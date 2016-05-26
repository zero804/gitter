"use strict";

var proxyquireNoCallThru = require("proxyquire").noCallThru();
var assert = require('assert');
var Promise = require('bluebird');
var testGenerator = require('../../../../test/integration/test-generator');

var mockito = require('jsmockito').JsMockito;

var USERNAME = 'gitterbob';

// All of our fixtures
var FIXTURES = [{
  name: 'unauthenticated users',
  meta: {
    user: false,
    security: 'PUBLIC',
    expectedResult: true
  },
  tests: [
    { right: 'view', security: 'PUBLIC', expectedResult: true }, // Can view an unauthenicated channel
    {
      name: 'cant do anything else',
      meta: {
        expectedResult: false
      },
      tests: [
        { right: 'view', security: 'PRIVATE' },
        { right: 'create', security: 'PUBLIC' },
        { right: 'adduser', security: 'PUBLIC' }
      ]
    }
  ]
}, {
  name: 'authenticated users',
  meta: {
    user: true
  },
  tests: [{
    name: 'create',
    meta: {
      right: 'create'
    },
    tests:[
      { name: 'You cant create PUBLIC room under someone elses account',
        security: 'PUBLIC', ownChannel: false, expectedResult: false },
      { name: 'You cant create PRIVATE room under someone elses account',
        security: 'PUBLIC', ownChannel: false, expectedResult: false },
      { name: 'under own account',
        meta: { ownChannel: true },
        tests: [
          { name: 'allow create of a public channel',
            security: 'PUBLIC', expectedResult: true },
          { name: 'allow create of a private channel for user',
            security: 'PRIVATE', expectedResult: true, },
        ]
      }
    ]
  }, {
    name: 'join and view',
    tests:[{
      name: 'public channels',
      meta: {
        security: 'PUBLIC',
        expectedResult: true
      },
      tests: [ { right: 'join' }, { right: 'view' }]
    },{
      name: 'private channels',
      meta: {
        security: 'PRIVATE'
      },
      tests: [

        { userIsInRoom: true, expectedResult: true,
          tests: [{ right: 'view' }, { right: 'join' }] },

        // { userIsInRoom: true, premiumOwner: false, expectedResult: 'throw', expectedErrStatus: 402,
          // tests: [{ right: 'view' }, { right: 'join' }] },

        { userIsInRoom: false, expectedResult: false,
          tests: [{ right: 'view' }, { right: 'join' }] },

      ]
    }]
  }, {
    name: 'admin',
    meta: {
      right: 'admin',
      security: 'PUBLIC',
    },
    tests:[
      { name: 'The owner is the admin',
        ownChannel: true, expectedResult: true },
      { name: 'A non owner is not the admin',
        ownChannel: true, expectedResult: true },
    ]
  }, {
    name: 'adduser',
    meta: {
      right: 'adduser'
    },
    tests:[
      { name: 'Anyone can add people to a public room',
        security: 'PUBLIC', expectedResult: true }, // Anyone can add someone to a public room
      { name: 'Non room members can adduser',
        security: 'PRIVATE', userIsInRoom: false, expectedResult: false },
      { name: 'Room members can adduser',
        security: 'PRIVATE', userIsInRoom: true, expectedResult: true },
      { name: 'owner can always add',
        security: 'PRIVATE', ownChannel: true, userIsInRoom: false, expectedResult: true },
    ]
  }]
}];


describe('user-channel-permissions', function() {
  testGenerator(FIXTURES, function(name, meta) {

    if(!name) name = 'should be ' + (meta.expectedResult ? 'allowed' : 'denied') + ' ' + meta.right;
    it(name, function(done) {
      var RIGHT = meta.right;
      var USER = meta.user ? { username: USERNAME } : null;
      var EXPECTED = meta.expectedResult;
      var SECURITY = meta.security;
      var URI = meta.ownChannel ? USERNAME + '/channel' : 'someoneelse/channel';

      var userIsInRoomMock = mockito.mockFunction();


      var permissionsModel = proxyquireNoCallThru("../../lib/models/user-channel-permissions-model", {
        '../user-in-room': userIsInRoomMock
      });

      mockito.when(userIsInRoomMock)().then(function(uri, user) {
        assert.strictEqual(uri, URI);
        assert.strictEqual(user, USER);
        return Promise.resolve(!!meta.userIsInRoom);
      });

      permissionsModel(USER, RIGHT, URI, SECURITY)
        .then(function(result) {
          if(EXPECTED !== 'throw') {
            assert.strictEqual(result, EXPECTED);
          } else {
            assert(false, 'Expected the permission model to throw an exception');
          }
        }, function(err) {
          if(EXPECTED !== 'throw') throw err;
          if(meta.expectedErrStatus) {
            assert.strictEqual(err.status, meta.expectedErrStatus);
          }
        })
        .nodeify(done);
    });

  });
});
