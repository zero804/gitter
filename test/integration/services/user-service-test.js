/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true, before:true, after:true */
"use strict";

var testRequire        = require('./../test-require');
var fixtureLoader      = require('../test-fixtures');
var persistenceService = testRequire('./services/persistence-service');
var userService        = testRequire('./services/user-service');
var assert             = testRequire("assert");
var Q                  = require('q');

var fixture = {};
var fixture2 = {};

describe("User Service", function() {

  before(fixtureLoader(fixture2, {
    user1: { username: true },
    user2: { }
  }));

  before(fixtureLoader(fixture));

  describe("#saveLastVisitedTroupeforUserId", function() {
    it('should record the time each troupe was last accessed by a user', function(done) {

      userService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id, function(err) {
        if(err) return done(err);

      persistenceService.User.findById(fixture.user1.id, function(err, user) {
        if(err) return done(err);

        assert.equal(user.lastTroupe, fixture.troupe1.id);

        userService.getTroupeLastAccessTimesForUser(fixture.user1.id, function(err, times) {
            if(err) return done(err);
            var troupeId = "" + fixture.troupe1.id;

            var after = times[troupeId];
            assert(after, 'Expected a value for last access time');

            userService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1.id, function(err) {
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
  });

  describe('#findByLogin', function() {

    it('should find testuser by username', function(done) {

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
      var userService = testRequire("./services/user-service");

      var email = 'testuser@troupetest.local';
      userService.findByLogin(email, function(err, user) {
        assert(user, "A user should have been found");
        assert(user.email === email, "Incorrect user found");
        done();
      });

    });
  });

  //
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




  it('should allow two users with the same githubId to be created at the same moment, but only create a single account', function(done) {
    var userService = testRequire("./services/user-service");

    var githubId = fixture2.generateGithubId();
    Q.all([
      userService.findOrCreateUserForGithubId({ githubId: githubId, username: fixture2.generateUsername(), githubToken: fixture2.generateGithubToken() }),
      userService.findOrCreateUserForGithubId({ githubId: githubId, username: fixture2.generateUsername(), githubToken: fixture2.generateGithubToken() })
      ])
      .spread(function(user1, user2) {
        assert.strictEqual(user1.id, user2.id);
        assert.strictEqual(user1.confirmationCode, user2.confirmationCode);
      })
      .nodeify(done);
  });




  after(function() {
    fixture.cleanup();
    fixture2.cleanup();
  });
});