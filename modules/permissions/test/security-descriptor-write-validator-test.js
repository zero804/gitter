'use strict';

var securityDescriptorWriteValidator = require('../lib/security-descriptor-write-validator');
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;

describe('security-descriptor-write-validator', function() {

  it('should validate correctly', function() {
    var sd = {
      type: 'GH_REPO',
      linkPath: 'gitterHQ/gitter',
      admins: 'GH_REPO_PUSH',
      members: 'PUBLIC',
      public: true
    };

    securityDescriptorWriteValidator(sd);
  });

  it('should fail correctly, 1', function() {
    var sd = {
      type: null,
      admins: 'MANUAL',
      members: 'PUBLIC',
      public: true
    };

    try {
      securityDescriptorWriteValidator(sd);
      assert.ok(false);
    } catch(e) {
      assert.strictEqual(e.status, 400);
    }
  });

  it('should fail correctly, 2', function() {
    var sd = {
      type: null,
      admins: 'MANUAL',
      members: 'PUBLIC',
      public: true,
      extraAdmins: []
    };

    try {
      securityDescriptorWriteValidator(sd);
      assert.ok(false);
    } catch(e) {
      assert.strictEqual(e.status, 400);
    }
  });

  it('should succeed for extraAdmins', function() {
    var sd = {
      type: null,
      admins: 'MANUAL',
      members: 'PUBLIC',
      public: true,
      extraAdmins: [new ObjectID()]
    };

    securityDescriptorWriteValidator(sd);
  });
});
