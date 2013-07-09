/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true, before:true */
"use strict";

var testRequire = require('./../test-require');
var fixtureLoader = require('../test-fixtures');

var userService = testRequire('./services/user-service');
var signupService = testRequire('./services/signup-service');
var assert = testRequire("assert");

var fixture = {};

describe("User Service", function() {

  var userId = null;

  describe("#updateProfile", function() {
    it("should update the name, email, password and status of a user", function(done) {

      var userParams = {
        email: "user-service@troupetest.local",
        displayName: "Tester",
        status: "ACTIVE"
      };

      userService.newUser(userParams, function(e, user) {
        assert.strictEqual(e, null);
        assert.notStrictEqual(user, null);
        assert.notStrictEqual(typeof user, 'undefined');

        userId = user.id; // so we can clean up
        var oldUserStatus = user.status;
        var params = {
          userId: user.id,
          // displayName: user.displayName,
          // password: "newPass",
          // oldPassword: "oldPass",
          email: "hopefully-unregistered-user-service-test" + Date.now() + "@troupetest.local"
        };

        userService.updateProfile(params, function(e, user) {
          assert.strictEqual(e, null);
          assert.notStrictEqual(user, null);

          // assert.strictEqual(user.displayName, params.displayName);
          assert.strictEqual(user.newEmail, params.email);
          assert.notStrictEqual(user.confirmationCode, null);
          assert.strictEqual(user.status, oldUserStatus);

          // get the confirmation code and run the confirmation
          signupService.confirmEmailChange(user, function(e) {
            assert.strictEqual(e, null);
            assert.strictEqual(user.email, params.email);
            // assert.strictEqual(typeof user.newEmail, 'undefined');
            assert.strictEqual(!user.newEmail, true);

            // delete the user so that the test is atomic
            user.remove(function(e) {
              assert.strictEqual(e, null);

              done();
            });

          });

        });
      });

    });
  });

  describe("#saveLastVisitedTroupeforUser", function() {
    it('should record the time each troupe was last accessed by a user', function(done) {

      userService.saveLastVisitedTroupeforUser(fixture.user1.id, fixture.troupe1, function(err) {
        if(err) return done(err);

        userService.getTroupeLastAccessTimesForUser(fixture.user1.id, function(err, times) {
          if(err) return done(err);
          var troupeId = "" + fixture.troupe1.id;

          var after = times[troupeId];
          assert(after, 'Expected a value for last access time');

          userService.saveLastVisitedTroupeforUser(fixture.user1.id, fixture.troupe1, function(err) {
            if(err) return done(err);

            userService.getTroupeLastAccessTimesForUser(fixture.user1.id, function(err, times) {
              if(err) return done(err);
              assert(times[troupeId] > after, 'The last access time for this troupe has not changed. Before it was ' + after + ' now it is ' + times[troupeId]);
              done();
            });
          });
        });

      });


    });
  });

  before(fixtureLoader(fixture));

});