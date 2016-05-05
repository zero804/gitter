"use strict";

var proxyquireNoCallThru = require("proxyquire").noCallThru();
var assert = require('assert');
var mockito = require('jsmockito').JsMockito;
var testGenerator = require('../../../../test/integration/test-generator');
var Promise = require('bluebird');


// var FIXTURE = {
//   join: true,
//   adduser: false,
//   create: true,
//   admin: false
// };

describe('ONETOONE', function() {

  // All of our fixtures
  var FIXTURES = [{
    name: 'One to one conversations with non-signed-in users',
    meta: {
      user: { username: 'gitterbob' },
      security: null,
      uri: 'x',
      userHasSignedUp: false,
      expectedResult: 'throw'
    },
    tests: [
      { right: 'join', expectedResult: 'throw' },
      { right: 'create', expectedResult: 'throw' },
      { right: 'adduser', expectedResult: false },
      { right: 'admin', expectedResult: false },
    ]
  },{
    name: 'Unauthenticated users',
    meta: {
      user: { username: 'gitterbob' },
      security: null,
      uri: 'x',
      userHasSignedUp: true,
    },
    tests: [
      { right: 'join', expectedResult: true },
      { right: 'create', expectedResult: true },
      { right: 'adduser', expectedResult: false },
      { right: 'admin', expectedResult: false },
    ]
  }];

  testGenerator(FIXTURES, function(name, meta) {
    var SECURITY = meta.security;
    var URI = meta.uri;
    var EXPECTED = meta.expectedResult;
    var RIGHT = meta.right;
    var HAS_SIGNED_UP = meta.userHasSignedUp;
    var USER = meta.user;

    var userHasSignedUpMock = mockito.mockFunction();

    var permissionsModel = proxyquireNoCallThru("../../lib/models/one-to-one-permissions-model", {
      '../user-has-signed-up': userHasSignedUpMock
    });


    it('should ' + (EXPECTED ? 'allow' : 'deny') + ' ' + RIGHT, function(done) {
      mockito.when(userHasSignedUpMock)().then(function() {
        return Promise.resolve(HAS_SIGNED_UP);
      });

      permissionsModel(USER, RIGHT, URI, SECURITY)
        .then(function(result) {
          if(EXPECTED === 'throw') throw new Error('Expected throw');

          if(EXPECTED === true || EXPECTED === false) {
            assert.strictEqual(result, EXPECTED);
          }
        }, function(err) {
          if(EXPECTED === 'throw') return;
          throw err;
        })
        .nodeify(done);
    });
  });

  // var security = null;
  // var uri = 'x';

  // Object.keys(FIXTURE).forEach(function(right) {
  //   var expectedOutcome = FIXTURE[right];


  //   it('should allow', function(done) {
  //     return permissionsModel(user, right, uri, security)
  //       .then(function(outcome) {
  //         assert.strictEqual(outcome, expectedOutcome);
  //       })
  //       .nodeify(done);
  //   });

  // });

});
