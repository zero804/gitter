/*global describe:true, it:true */
"use strict";

var testRequire = require('./../test-require');
var Promise = require('bluebird');
var assert = require('assert');

describe("email-address-service", function() {
  beforeEach(function() {
    this.stubData = {};
    this.user = {};
    var self = this;

    var env = {
        config: {
          get: function () {
            return self.stubData.overrideEmail;
          }
        }
      };

    function FakeMuxer(user) {
      assert.strictEqual(user, self.user);
      this.getEmailAddress = function() {
        return Promise.resolve('x@y.com');
      };
    }

    this.emailAddressService = testRequire.withProxies('./services/email-address-service', {
      'gitter-web-env': env,
      './backend-muxer': FakeMuxer
    });
  });

  it('should call the backend', function() {
    return this.emailAddressService(this.user)
      .then(function(email) {
        assert.strictEqual(email, 'x@y.com');
      });
  });

  it('should use the invited email if it exists', function() {
    this.user.invitedEmail = 'a@b.com';
    return this.emailAddressService(this.user, { preferInvitedEmail: true })
      .then(function(email) {
        assert.strictEqual(email, 'a@b.com');
      });
  });

  it('should fallback', function() {
    return this.emailAddressService(this.user, { preferInvitedEmail: true })
      .then(function(email) {
        assert.strictEqual(email, 'x@y.com');
      });
  });

});
