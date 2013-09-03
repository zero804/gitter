/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true, before:true, after:true */
"use strict";

var testRequire = require('./../test-require');
var fixtureLoader = require('../test-fixtures');
var persistenceService = testRequire('./services/persistence-service');
var userService = testRequire('./services/user-service');
var signupService = testRequire('./services/signup-service');
var assert = testRequire("assert");

var fixture = {};
var fixture2 = {};

describe("User Service", function() {

  before(fixtureLoader(fixture2, {
    user1: { username: true },
    user2: { }
  }));

  before(fixtureLoader(fixture));

  describe("#updateProfile", function() {
    it("should update the name, email, password and status of a user", function(done) {

      var user1 = fixture.user1;
      var params = {};
      params.userId = user1.id;
      params.displayName = 'Tested User';
      params.oldEmail = user1.email;
      params.email = "hopefully-unregistered-user-service-test" + Date.now() + "@troupetest.local";
      params.password = '654321';
      params.oldPassword = '123456';

      var oldUserStatus = user1.status;

      userService.updateProfile(params, function(e, user) {
        assertions(e, user, function() {
          // reset test user values, keeping this test atomic
          params.displayName = user1.displayName;
          params.oldEmail = params.email;
          params.email = user1.email;
          params.oldPassword = params.password;
          params.password = '123456';

          userService.updateProfile(params, function(e, user) {
            assertions(e, user, done);
          });

        });

      });

      function assertions(e, user, callback) {
        assert.strictEqual(e, null);
        assert.notStrictEqual(user, null);

        assert.strictEqual(user.displayName, params.displayName);
        assert.strictEqual(user.email, params.oldEmail);
        assert.strictEqual(user.newEmail, params.email);
        assert.notStrictEqual(user.confirmationCode, null);
        assert.strictEqual(user.status, oldUserStatus);

        userService.checkPassword(user, params.password, function(matches) {
          assert.equal(matches, true);

          // get the confirmation code and run the confirmation
          signupService.confirmEmailChange(user, function(e) {
            assert.strictEqual(e, null);
            assert.strictEqual(user.email, params.email);
            // assert.strictEqual(typeof user.newEmail, 'undefined');
            assert.strictEqual(!user.newEmail, true);

            callback();
          });
        });
      }

    });
  });

  describe("#saveLastVisitedTroupeforUserId", function() {
    it('should record the time each troupe was last accessed by a user', function(done) {

      userService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1, function(err) {
        if(err) return done(err);

      persistenceService.User.findById(fixture.user1.id, function(err, user) {
        if(err) return done(err);

        assert.equal(user.lastTroupe, fixture.troupe1.id);

        userService.getTroupeLastAccessTimesForUser(fixture.user1.id, function(err, times) {
            if(err) return done(err);
            var troupeId = "" + fixture.troupe1.id;

            var after = times[troupeId];
            assert(after, 'Expected a value for last access time');

            userService.saveLastVisitedTroupeforUserId(fixture.user1.id, fixture.troupe1, function(err) {
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


  describe('#secondary-email-addresses', function() {
    it('should allow adding of secondary email addresses', function(done) {
      var userService = testRequire("./services/user-service");
      var newEmail = fixture2.generateEmail();

      userService.addSecondaryEmail(fixture2.user1, newEmail)
        .then(function(user) {
          assert.equal(user.unconfirmedEmails.length, 1);
          var userEmail = user.unconfirmedEmails[0];
          assert.equal(userEmail.email, newEmail);
          assert(userEmail.confirmationCode, 'Expected a confirmation code');
          // TODO make sure a confirmation is sent

          // test the lookup by unconfirmed email address
          userService.findByUnconfirmedEmail(userEmail.email, function(err, user1) {
            if (err) done(err);

            assert(!!user1, "No user found");
            assert(user.id === user1.id, "Found user does not match");

            // test the lookup by confirmation code
            userService.findByConfirmationCode(userEmail.confirmationCode, function(err, user2) {
              if (err) done(err);

              assert(!!user2, "No user found");
              assert(user.id === user2.id, "Found user does not match");
              done();
            });

          });

        });
    });

    it('should allow removing of secondary email addresses', function(done) {
      var userService = testRequire("./services/user-service");
      var newEmail = fixture2.generateEmail();

      userService.addSecondaryEmail(fixture2.user1, newEmail)
        .then(function(user) {

          return userService.removeSecondaryEmail(user, newEmail)
            .then(function(user) {
              assert.equal(user.emails.indexOf(newEmail), -1);
            });

        })
        .nodeify(done);
    });


    it('should allow secondary email addresses to be confirmed', function(done) {
      var userService = testRequire("./services/user-service");
      var newEmail = fixture2.generateEmail();

      userService.addSecondaryEmail(fixture2.user1, newEmail)
        .then(function(user) {
          var userEmail = user.unconfirmedEmails.filter(function(userEmail) { return userEmail.email === newEmail; })[0];

          return userService.confirmSecondaryEmail(fixture2.user1, userEmail.confirmationCode)
            .then(function() {
              assert.notEqual(user.emails.indexOf(newEmail), -1);

            });

          })
        .nodeify(done);
    });

    it('should fail when an invalid confirmation code is used', function(done) {
      var userService = testRequire("./services/user-service");
      var newEmail = fixture2.generateEmail();

      userService.addSecondaryEmail(fixture2.user1, newEmail)
        .then(function(user) {
          var userEmail = user.unconfirmedEmails.filter(function(userEmail) { return userEmail.email === newEmail; })[0];

          return userService.confirmSecondaryEmail(fixture2.user1, userEmail.confirmationCode + '1')
            .then(function() {
              assert.fail('Expected an error');
            }, function(err) {
              assert.equal(err, 404);
            });

          })
        .nodeify(done);
    });

    it('should allow a confirmed secondary email address to be switched to primary', function(done) {
      var userService = testRequire("./services/user-service");
      var newEmail = fixture2.generateEmail();
      var originalEmail = fixture2.user1.email;

      userService.addSecondaryEmail(fixture2.user1, newEmail)
        .then(function(user) {
          var userEmail = user.unconfirmedEmails.filter(function(userEmail) { return userEmail.email === newEmail; })[0];

          return userService.confirmSecondaryEmail(fixture2.user1, userEmail.confirmationCode)
            .then(function() {

              return userService.switchPrimaryEmail(fixture2.user1, newEmail)
                .then(function(user) {
                  assert.equal(user.email, newEmail);
                  assert(user.emails.indexOf(originalEmail) >= 0, 'Expected the primary email to become a secondary confirmed email address');
                });
            });

          })
        .nodeify(done);
    });

    it('should not allow an unconfirmed secondary email address to be switched to primary', function(done) {
      var userService = testRequire("./services/user-service");
      var newEmail = fixture2.generateEmail();

      userService.addSecondaryEmail(fixture2.user1, newEmail)
        .then(function() {

          return userService.switchPrimaryEmail(fixture2.user1, newEmail)
            .then(function() {
              assert.fail('Should have failed');
            }, function(err) {
              assert.equal(err, 404);
            });

          })
        .nodeify(done);
    });

    it('should not allow an unknown email address to be switched to primary', function(done) {
      var userService = testRequire("./services/user-service");

      return userService.switchPrimaryEmail(fixture2.user1, 'andrewn@datatribe.net')
        .then(function() {
          assert.fail('Should have failed');
        }, function(err) {
          assert.equal(err, 404);
        })
        .nodeify(done);
    });

    it('should not allow an email address to be duplicated with another primary', function(done) {
      var userService = testRequire("./services/user-service");

      userService.addSecondaryEmail(fixture2.user1, fixture2.user2.email)
        .then(function() {
          assert.fail('Expected failure');
        }, function(err) {
          assert.equal(err, 409);
        })
        .nodeify(done);
    });

    it('should not allow an email address to be duplicated with another confirmed secondary', function(done) {
      var userService = testRequire("./services/user-service");
      var newEmail = fixture2.generateEmail();

      userService.addSecondaryEmail(fixture2.user2, newEmail)
        .then(function(user) {
          var unconfirmedEmail = user.unconfirmedEmails.filter(function(userEmail) { return userEmail.email === newEmail; })[0];

          return userService.confirmSecondaryEmail(user, unconfirmedEmail.confirmationCode)
            .then(function() {
              userService.addSecondaryEmail(fixture2.user1, newEmail)
                .then(function() {
                  assert.fail('Expected failure');
                }, function(err) {
                  assert.equal(err, 409);
                });

            });

        })
        .nodeify(done);
    });
  });


  it('should allow an email address to be duplicated with another unconfirmed secondary, and delete other unconfirmeds on confirmation', function(done) {
    var userService = testRequire("./services/user-service");
    var newEmail = fixture2.generateEmail();

    userService.addSecondaryEmail(fixture2.user2, newEmail)
      .then(function() {
        return userService.addSecondaryEmail(fixture2.user1, newEmail);
      })
      .then(function(user1) {
        var unconfirmedEmail = user1.unconfirmedEmails.filter(function(userEmail) { return userEmail.email === newEmail; })[0];
        return userService.confirmSecondaryEmail(user1, unconfirmedEmail.confirmationCode);
      })
      .then(function() {
        return userService.findById(fixture2.user2.id);
      })
      .then(function(user2) {
        assert(user2.unconfirmedEmails.filter(function(userEmail) { return userEmail.email === newEmail; }).length === 0);
      })
      .nodeify(done);
  });


  after(function() {
    fixture2.cleanup();
  });
});