/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var testRequire = require('../test-require');

var passport = testRequire('./web/passport');
var persistence = testRequire('./services/persistence-service');

var assert = require('assert');

describe('passport', function() {
  describe('acceptClientStrategy', function() {

    it('should allow an invite to a new user to be accepted', function(done) {
      var strategy = passport.inviteAcceptStrategy;
      var confirmationCode = 'TEST-CONFIRM-' + Date.now();
      var email = 'passport-test-user-' + Date.now() + '@troupetest.local';
      var troupeUri = 'testtroupe1';

      persistence.Troupe.findOne({ uri: troupeUri}, function(err, troupe) {
        if(err) return done(err);
        if(!troupe) return done('Test troupe not found');

        // create invite for user that doesn't yet exist
        persistence.Invite.create({
          troupeId: troupe.id,
          displayName:'Test User from Invite',
          email: email,
          code: confirmationCode,
          status: 'UNUSED' }, function(err) {
            if(err) return done(err);

            strategy.verify(confirmationCode, { params: { troupeUri: troupeUri }}, function(err, user) {
              if(err) return done(err);
              assert(user, 'User not created');
              assert(user.displayName == 'Test User from Invite', 'User display name set incorrectly');
              assert(user.email == email, 'User email set incorrectly');

              done();
            });
          });
      });
    });

  it('should login the user re-using an invite if their profile is not complete', function() {

  });

  it('should not login the user (redirect) if their profile is complete and they have already used the invite', function() {

  });

  });
});

