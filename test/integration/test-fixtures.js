/*jslint node:true, unused:true*/
"use strict";

var testRequire = require('./test-require');

var Q = require("q");
var assert = require("assert");
var persistence = testRequire("./services/persistence-service");
var assert = require('assert');
var winston = testRequire("./utils/winston");
var counter = 0;

function generateEmail() {
  return 'testuser' + (++counter) + Date.now() + '@troupetest.local';
}

function generateName() {
  return 'Test ' + (++counter) + ' ' + Date.now();
}

function generateUri() {
  return '_test_' + (++counter) + Date.now();
}

function generateUsername() {
  return '_testuser_' + (++counter) + Date.now();
}

function createBaseFixture() {
  return {
    generateEmail: generateEmail,
    generateName: generateName,
    generateUri: generateUri,
    generateUsername: generateUsername,

    cleanup: function() {
      var self = this;
      Object.keys(this).forEach(function(key) {
        var o = self[key];
        if(o.remove) o.remove();
      });
    }
  };
}

function load(expected, done) {
  if(expected) {
    return createExpectedFixtures(expected, done);
  }

  function only(a) {
    assert(a.length, "Fixture data is missing");
    assert(a.length == 1, "Multiple fixture data items found. Expected exactly one: " + JSON.stringify(a));
    return a[0];
  }

  var fixture = createBaseFixture();

  Q.all([
      persistence.User.findQ({ email: 'testuser@troupetest.local' }).then(only).then(function(user) { fixture.user1 = user; }),
      persistence.User.findQ({ email: 'testuser2@troupetest.local' }).then(only).then(function(user) { fixture.user2 = user; }),
      persistence.User.findQ({ email: 'testuserwithnotroupes@troupetest.local' }).then(only).then(function(user) { fixture.userNoTroupes = user; }),
      persistence.Troupe.findQ({ uri: 'testtroupe1' }).then(only).then(function(troupe) { fixture.troupe1 = troupe; }),
      persistence.Troupe.findQ({ uri: 'testtroupe2' }).then(only).then(function(troupe) { fixture.troupe2 = troupe; })
    ])
    .then(function() {
      assert(fixture.troupe1.containsUserId(fixture.user1.id), 'Test data is broken. User1 should be in troupe1. Troupe1 contains: ' + fixture.troupe1.users.join(','));
      assert(fixture.troupe1.containsUserId(fixture.user2.id), 'Test data is broken. User1 should be in troupe1');

      assert(!fixture.troupe1.containsUserId(fixture.userNoTroupes.id), 'Test data is broken. userNoTroupes should not be in troupe1');
      assert(!fixture.troupe2.containsUserId(fixture.userNoTroupes.id), 'Test data is broken. userNoTroupes should not be in troupe1');

      assert(fixture.troupe2.users.length === 0, 'Fixture error: troupe2 should not contain any users');

      // For now, keep it safe
      delete fixture.cleanup;
      return fixture;
    })
    .nodeify(done);

}


function createExpectedFixtures(expected, done) {
  function createUser(fixtureName, f) {

    winston.verbose('Creating ' + fixtureName);

    // A username of true means generate one
    var username = f.username === true ? generateUsername() : f.username;

    return persistence.User.createQ({
      email:        f.email || generateEmail(),
      displayName:  f.displayName || generateName(),
      username:     username,
      status:       f.status || 'ACTIVE'
    });
  }

  function createTroupe(fixtureName, f) {
    var users;

    if(f.userIds) {
      users = f.userIds.map(function(userId) { return { userId: userId }; });
    } else {
      users = [];
    }

    winston.verbose('Creating ' + fixtureName);

    var uri;
    if(f.oneToOne) {
      uri = null;
    } else {
      uri = f.uri || generateUri();
    }

    return persistence.Troupe.createQ({
      name: f.name || '~~~TEST~~~ ' + fixtureName,
      uri: uri,
      status: f.status || 'ACTIVE',
      oneToOne: f.oneToOne,
      users: users,
      dateDeleted: f.dateDeleted
    });
  }

  function createUsers(fixture) {
    var userCounter = 0;
    var promises = Object.keys(expected).map(function(key) {

      if(key.match(/^user/)) {
        return createUser(key, expected[key])
          .then(function(user) {
            fixture[key] = user;
          });
      }

      if(key.match(/^troupe/)) {
        var t = expected[key];
        if(t.users) {
          if(!Array.isArray(t.users)) {
            t.users = [t.users];
          }

          return Q.all(t.users.map(function(user, index) {
              if(typeof user == 'string') {
                if(expected[user]) return; // Already specified at the top level
                expected[user] = {};
                return createUser(user, {}).then(function(createdUser) {
                  fixture[user] = createdUser;
                });
              }

              var fixtureName = 'user' + (++userCounter);
              t.users[index] = fixtureName;
              expected[fixtureName] = user;

              return createUser(fixtureName, user)
                .then(function(user) {
                  fixture[fixtureName] = user;
                });

            }));
        }
      }

      return null;
    });

    return Q.all(promises).then(function() { return fixture; });
  }

  function createTroupes(fixture) {
    var promises = Object.keys(expected).map(function(key) {

      if(key.match(/^troupe/)) {
        var expectedTroupe = expected[key];

        var userIds = expectedTroupe.users && expectedTroupe.users.map(function(user) {
          return fixture[user]._id;
        });

        expectedTroupe.userIds = userIds;

        return createTroupe(key, expectedTroupe)
          .then(function(troupe) {
            fixture[key] = troupe;
          });
      }

      return null;
    });

    return Q.all(promises).then(function() { return fixture; });
  }

  return createUsers(createBaseFixture())
    .then(createTroupes)
    .nodeify(done);
}

function fixtureLoader(fixture, expected) {
  return function(done) {
     load(expected, function(err, data) {
       if(err) return done(err);

       Object.keys(data).forEach(function(key) {
        fixture[key] = data[key];
       });

       done();
     });

   };
}

fixtureLoader.use = function(expected) {
  return createExpectedFixtures(expected);
};

module.exports = fixtureLoader;
