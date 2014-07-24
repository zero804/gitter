"use strict";

var testRequire = require('./test-require');

var Q = require("q");
var persistence = testRequire("./services/persistence-service");
var winston = testRequire("./utils/winston");
var counter = 0;

function generateEmail() {
  return 'testuser' + (++counter) + Date.now() + '@troupetest.local';
}

function generateName() {
  return 'Test ' + (++counter) + ' ' + Date.now();
}

function generateUri(roomType) {
  if(roomType === 'REPO') {
      return '_test_' + (++counter) + Date.now() + '/_repo_' + (++counter) + Date.now();
  }

  return '_test_' + (++counter) + Date.now();
}

function generateUsername() {
  return '_testuser_' + (++counter) + Date.now();
}

function generateGithubId() {
  var hr = process.hrtime();
  return hr[0] + hr[1];
}

function generateGithubToken() {
  return '64c1d90a8c60d2ee75fc5b3d3f7881d94559fec8';
}

function createBaseFixture() {
  return {
    generateEmail: generateEmail,
    generateName: generateName,
    generateUri: generateUri,
    generateUsername: generateUsername,
    generateGithubId: generateGithubId,
    generateGithubToken: generateGithubToken,

    cleanup: function() {
      var self = this;
      Object.keys(this).forEach(function(key) {
        var o = self[key];
        if(o.removeQ) {
          o.removeQ();
        }
      });
    }
  };
}

function load(expected, done) {
  if(expected) {
    // DO THINGS THE NEW SCHOOL WAY
    return createExpectedFixtures(expected, done);
  }

  console.error('Using old school fixtures. Try change this sometime old chap.');
  return createExpectedFixtures({
    user1: {
      //email: 'testuser@troupetest.local'
    },
    user2: {
      //email: 'testuser2@troupetest.local'
    },
    user3: {
      //email: 'testuser3@troupetest.local'
    },
    userNoTroupes: {
      //email: 'testuserwithnotroupes@troupetest.local'
    },
    troupe1: {
      //uri: 'testtroupe1',
      users: ['user1', 'user2']
    },
    troupe2: {
      //uri: 'testtroupe2',
    },
    troupe3: {
      /* This troupe should not include test user 2 */
      //uri: 'testtroupe3',
      users: ['user1', 'user3']
    }
  }, done);


}


function createExpectedFixtures(expected, done) {
  function createUser(fixtureName, f) {

    winston.verbose('Creating ' + fixtureName);

    // A username of true means generate one
    var username = f.username === true ? generateUsername() : f.username;
    var confirmationCode = f.confirmationCode === true ? "confirm" + Math.random() : f.confirmationCode;

    return persistence.User.createQ({
      email:            f.email       || generateEmail(),
      displayName:      f.displayName || generateName(),
      githubId:         f.githubId    || generateGithubId(),
      githubToken:      f.githubToken || generateGithubToken(),
      confirmationCode: confirmationCode,
      username:         username      || generateUsername(),
      status:           f.status      || 'ACTIVE',
      permissions:      f.permissions
    });
  }

  function createContact(fixtureName, f) {
    winston.verbose('Creating ' + fixtureName);

    return persistence.Contact.createQ({
      name:          f.name    || 'John Doe',
      emails:        f.emails  || [generateEmail()],
      source:        f.source  || 'google',
      userId:        f.userId,
      contactUserId: f.contactUserId
    });
  }

  function createTroupe(fixtureName, f) {
    var users;

    if(f.userIds) {
      users = f.userIds.map(function(userId) { return { userId: userId }; });
    } else {
      users = [];
    }

    var security = f.security || undefined;

    winston.verbose('Creating ' + fixtureName);

    var uri;
    var githubType = f.githubType || 'ORG';
    if(f.oneToOne) {
      uri = null;
    } else {
      uri = f.uri || generateUri(githubType);
    }

    return persistence.Troupe.createQ({
      name: f.name || '~~~TEST~~~ ' + fixtureName,
      uri: uri,
      status: f.status || 'ACTIVE',
      oneToOne: f.oneToOne,
      security: security,
      users: users,
      githubType: githubType,
      dateDeleted: f.dateDeleted
    });
  }

  function createInvite(fixtureName, f) {
    winston.verbose('Creating ' + fixtureName);

    return persistence.Invite.createQ({
      fromUserId:   f.fromUserId,
      userId:       f.userId,
      email:        f.email,
      code:         f.code,
      troupeId:     f.troupeId,
      status:       f.status    || 'UNUSED'
    });

  }

  function createMessage(fixtureName, f) {
    winston.verbose('Creating ' + fixtureName);

    return persistence.ChatMessage.createQ({
      fromUserId:   f.fromUserId,
      toTroupeId:   f.toTroupeId,
      text:         f.text,
      status:       f.status,
      html:         f.html,
      urls:         f.urls,
      mentions:     f.mentions,
      issues:       f.issues,
      meta:         f.meta,
      sent:         f.sent,
      editedAt:     f.editedAt,
      readBy:       f.readBy,
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

      if(key.match(/^contact/)) {
        var cu = expected[key];

        if(cu.user) {
          if(typeof cu.user == 'string') {
            if(expected[cu.user]) return; // Already specified at the top level
            expected[cu.user] = {};
            return createUser(cu.user, {}).then(function(createdUser) {
              fixture[cu.user] = createdUser;
            });
          }

          var fixtureName = 'user' + (++userCounter);
          expected[fixtureName] = cu.user;

          return createUser(fixtureName, cu.user)
            .then(function(user) {
              fixture[fixtureName] = user;
              cu.user = user;
            });


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

  function createContacts(fixture) {
    var promises = Object.keys(expected).map(function(key) {

        if(key.match(/^contact/)) {
          var expectedContact = expected[key];

          expectedContact.userId = fixture[expectedContact.user]._id;

          if(expectedContact.contactUser) {
            expectedContact.contactUserId = fixture[expectedContact.contactUser]._id;
          }

          return createContact(key, expectedContact)
            .then(function(contact) {
              fixture[key] = contact;
            });
        }

        return null;
      });
    return Q.all(promises).then(function() { return fixture; });
  }

  function createInvites(fixture) {
    var promises = Object.keys(expected).map(function(key) {

        if(key.match(/^invite/)) {
          var expectedInvite = expected[key];

          expectedInvite.fromUserId = fixture[expectedInvite.fromUser]._id;
          expectedInvite.userId = expectedInvite.user && fixture[expectedInvite.user]._id;
          expectedInvite.troupeId = expectedInvite.troupe && fixture[expectedInvite.troupe]._id;

          if(expectedInvite.email === true) {
            expectedInvite.email =  generateEmail();
          }

          if(expectedInvite.code === true) {
            expectedInvite.code =  "confirm" + Math.random();
          }
          return createInvite(key, expectedInvite)
            .then(function(invite) {
              fixture[key] = invite;
            });
        }

        return null;
      });
    return Q.all(promises).thenResolve(fixture);
  }

  function createMessages(fixture) {
    var promises = Object.keys(expected).map(function(key) {
      if(key.match(/^message/)) {
        var expectedMessage = expected[key];

        expectedMessage.fromUserId = fixture[expectedMessage.user]._id;
        expectedMessage.toTroupeId = fixture[expectedMessage.troupe]._id;

        return createMessage(key, expectedMessage)
          .then(function(message) {
            fixture[key] = message;
          });
      }

      return null;
    });

    return Q.all(promises).then(function() { return fixture; });
  }


  return createUsers(createBaseFixture())
    .then(createTroupes)
    .then(createContacts)
    .then(createInvites)
    .then(createMessages)
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

fixtureLoader.generateEmail = generateEmail;

module.exports = fixtureLoader;
