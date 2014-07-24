/*jslint node:true, unused:true*/
/*global describe:true, it:true, beforeEach */
"use strict";

var testRequire = require('../../test-require');
var assert = require('assert');

var permissionsModel = testRequire('./services/permissions/one-to-one-permissions-model');
var user;

describe('ONETOONE', function() {

  beforeEach(function() {
    user = { username: 'gitterbob' };
  });

  var FIXTURE = {
    join: true,
    adduser: false,
    create: true,
    admin: false
  };

  var security = null;
  var uri = 'x';

  Object.keys(FIXTURE).forEach(function(right) {
    var expectedOutcome = FIXTURE[right];

    it('should allow', function(done) {
      return permissionsModel(user, right, uri, security)
        .then(function(outcome) {
          assert.strictEqual(outcome, expectedOutcome);
        })
        .nodeify(done);
    });

  });

});
