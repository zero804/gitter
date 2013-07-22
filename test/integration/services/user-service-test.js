/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true, before:true, after:true */
"use strict";

var testRequire = require('./../test-require');
var fixtureLoader = require('../test-fixtures');

var userService = testRequire('./services/user-service');
var signupService = testRequire('./services/signup-service');
var assert = testRequire("assert");

var mockito = require('jsmockito').JsMockito;
var times = mockito.Verifiers.times;
var once = times(1);

var fixture = {};
var fixture2 = {};

describe("User Service", function() {

  before(fixtureLoader(fixture2, {
    user1: { username: true }
  }));

  before(fixtureLoader(fixture));

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

  describe('#findByLogin', function() {

    it('should find testuser by username', function(done) {

      var statsServiceMock = mockito.spy(testRequire('./services/stats-service'));
      var userService = testRequire("./services/user-service");

      var count = 0;
      var username = 'testuser1';
      userService.findByLogin(username, assertions);
      userService.findByLogin(username.toUpperCase(), assertions);


      function assertions(err, user) {
        assert(user, "A user should have been found");
        assert(user.username === username,  "Incorrect user found");
        count += 1;
        if (count == 2)
          done();
      }

    });


    it('should find testuser@troupetest.local by email', function(done) {
      var statsServiceMock = mockito.spy(testRequire('./services/stats-service'));
      var userService = testRequire("./services/user-service");

      var email = 'testuser@troupetest.local';
      userService.findByLogin(email, function(err, user) {
        assert(user, "A user should have been found");
        assert(user.email === email, "Incorrect user found");
        done();
      });

    });
  });


  describe('#findUsernameForUserId', function() {
    it('should findUsernameForUserId correctly', function(done) {
      var userService = testRequire("./services/user-service");
      userService.findUsernameForUserId(fixture2.user1.id)
        .then(function(username) {
          assert.equal(username, fixture2.user1.username);
        })
        .nodeify(done);
    });

  });

  after(function() {
    fixture2.cleanup();
  });
});