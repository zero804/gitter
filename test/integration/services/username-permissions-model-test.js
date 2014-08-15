/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true */
"use strict";

var testRequire        = require('./../test-require');
var assert             = testRequire('assert');

describe('username-permissions-model', function() {


  it('should create a temporary user with an id', function(done) {
    var permissions = testRequire.withProxies('./services/username-permissions-model', {
      './permissions-model': function(user) {
        assert(user._id);
        done();
      }
    });

    permissions('test-user').fail(done);
  });

  it('should create a temporary user with the same username', function(done) {
    var permissions = testRequire.withProxies('./services/username-permissions-model', {
      './permissions-model': function(user) {
        assert(user.username, 'test-user');
        done();
      }
    });

    permissions('test-user').fail(done);
  });

  it('should throw if there is no username', function(done) {
    var permissions = testRequire.withProxies('./services/username-permissions-model', {
      './permissions-model': function() {
        done(new Error('this should not be called'));
      }
    });

    permissions().fail(function(err) {
      assert(err);
      done();
    });
  });

});
