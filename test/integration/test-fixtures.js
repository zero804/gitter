"use strict";

var testRequire = require('./test-require');
var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');
var roomMembershipFlags = testRequire("./services/room-membership-flags");
var debug = require('debug')('gitter:tests:test-fixtures');
var counter = 0;

var seed = Date.now();

function generateEmail() {
  return 'testuser' + (++counter) + seed + '@troupetest.local';
}

function generateName() {
  return 'Test ' + (++counter) + ' ' + seed;
}

function generateUri(roomType) {
  if(roomType === 'REPO') {
    return '_test_' + (++counter) + seed + '/_repo_' + (++counter) + Date.now();
  }

  return '_test_' + (++counter) + seed;
}

function generateUsername() {
  return '_testuser_' + (++counter) + seed;
}

function generateGithubId() {
  return (++counter) + seed;
}

function generateGithubToken() {
  return '***REMOVED***';
}

function createBaseFixture() {
  return {
    generateEmail: generateEmail,
    generateName: generateName,
    generateUri: generateUri,
    generateUsername: generateUsername,
    generateGithubId: generateGithubId,
    generateGithubToken: generateGithubToken,

    cleanup: function(callback) {
      var self = this;

      var count = 0;

      return Promise.all(Object.keys(this).map(function(key) {
          var o = self[key];
          if(typeof o.remove === 'function') {
            count++;
            return o.remove();
          }
        }))
        .timeout(10000)
        .then(function() {
          debug('Removed %s items', count);
        })
        .nodeify(callback);
    }
  };
}

function load(expected, done) {
  if(expected) {
    // DO THINGS THE NEW SCHOOL WAY
    return createExpectedFixtures(expected, done);
  }

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

    debug('Creating %s', fixtureName);

    function possibleGenerate(key, fn) {
      if (f.hasOwnProperty(key)) {
        if (f[key] === true) {
          return fn();
        } else {
          return f[key];
        }
      } else {
        return fn()
      }
    }

    return persistence.User.create({
      identities:       f.identities,
      displayName:      possibleGenerate('displayName', generateName),
      githubId:         possibleGenerate('githubId', generateGithubId),
      githubToken:      possibleGenerate('githubToken', generateGithubToken),
      username:         possibleGenerate('username', generateUsername),
      state:            f.state || undefined,
      staff:            f.staff || false
    });
  }

  function createIdentity(fixtureName, f) {
    debug('Creating %s', fixtureName);

    return persistence.Identity.create({
      userId: f.userId,
      provider: f.provider,
      providerKey: f.providerKey,
      username: f.username,
      displayName: f.displayName,
      email: f.email,
      accessToken: f.accessToken,
      refreshToken: f.refreshToken,
      avatar: f.avatar
    });
  }

  function bulkInsertTroupeUsers(troupeId, userIds, membershipStrategy) {
      var bulk = persistence.TroupeUser.collection.initializeUnorderedBulkOp();

      userIds.forEach(function(userId, index) {
        var membership = membershipStrategy && membershipStrategy(userId, index);
        var flags, lurk;

        if (membership) {
          flags = membership.flags;
          lurk = membership.lurk;
        } else {
          flags = roomMembershipFlags.MODES.all;
          lurk = false;
        }

        bulk.find({ troupeId: troupeId, userId:userId })
          .upsert()
          .updateOne({
            $set: { flags: flags, lurk: lurk },
            $setOnInsert: { troupeId: troupeId, userId:userId }
          });
      });

      return Promise.fromCallback(function(callback) {
        bulk.execute(callback);
      });
  }

  function createTroupe(fixtureName, f) {
    var oneToOneUsers;

    if (f.oneToOne && f.userIds) {
      oneToOneUsers = f.userIds.map(function(userId) { return { userId: userId }; });
    } else {
      oneToOneUsers = [];
    }

    var security = f.security || undefined;

    var uri, lcUri, githubType;
    if (f.oneToOne) {
      githubType = 'ONETOONE';
    } else {
      githubType = f.githubType || 'ORG';
      uri = f.uri || generateUri(githubType);

      lcUri = uri.toLowerCase();
    }

    var doc = {
      uri: uri,
      lcUri: lcUri,
      githubId: f.githubId === true ? generateGithubId() : f.githubId || null,
      status: f.status || 'ACTIVE',
      oneToOne: f.oneToOne,
      security: security,
      oneToOneUsers: oneToOneUsers,
      githubType: githubType,
      dateDeleted: f.dateDeleted,
      userCount: f.users && f.users.length || f.userCount,
      tags: f.tags,
      providers: f.providers,
    };

    debug('Creating troupe %s with %j', fixtureName, doc);
    return persistence.Troupe.create(doc)
      .tap(function(troupe) {
        if (!f.userIds || !f.userIds.length) return;
        return bulkInsertTroupeUsers(troupe._id, f.userIds, f.membershipStrategy);
      })
      .tap(function(troupe) {

        var securityDescriptor = f.securityDescriptor || {};

        var type;
        if (securityDescriptor.type) {
          type = securityDescriptor.type;
        } else {
          type = f.oneToOne ? 'ONE_TO_ONE' : null;
        }

        return persistence.SecurityDescriptor.create({
          troupeId: troupe._id,

          // Permissions stuff
          type: type,
          members: securityDescriptor.members || 'PUBLIC',
          admins: securityDescriptor.admins || 'MANUAL',
          public: 'public' in securityDescriptor ? securityDescriptor.public : !f.oneToOne,
          linkPath: securityDescriptor.linkPath,
          externalId: securityDescriptor.externalId,
          extraMembers: securityDescriptor.extraMembers,
          extraAdmins: securityDescriptor.extraAdmins
        });
      });
  }

  function createInvite(fixtureName, f) {
    debug('Creating %s', fixtureName);

    return persistence.Invite.create({
      fromUserId:   f.fromUserId,
      userId:       f.userId,
      email:        f.email,
      code:         f.code,
      troupeId:     f.troupeId,
      status:       f.status || 'UNUSED'
    });

  }

  function createMessage(fixtureName, f) {
    debug('Creating %s', fixtureName);

    return persistence.ChatMessage.create({
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
        var users = [];

        if(t.users) {
          if(!Array.isArray(t.users)) {
            t.users = [t.users];
          }

          users = users.concat(t.users);
        }

        var extraMembers = t.securityDescriptor && t.securityDescriptor.extraMembers;
        if (extraMembers) {
          if(!Array.isArray(extraMembers)) {
            extraMembers = [extraMembers];
          }

          users = users.concat(extraMembers);
        }

        var extraAdmins = t.securityDescriptor && t.securityDescriptor.extraAdmins;
        if (extraAdmins) {
          if(!Array.isArray(extraAdmins)) {
            extraAdmins = [extraAdmins];
          }

          users = users.concat(extraAdmins);
        }

        return Promise.map(users, function(user, index) {
            if(typeof user === 'string') {
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

          });

      }

      return null;
    });

    return Promise.all(promises).then(function() { return fixture; });
  }

  function createIdentities(fixture) {
    var promises = Object.keys(expected).map(function(key) {
      if (key.match(/^identity/)) {
        var expectedIdentity = expected[key];

        expectedIdentity.userId = fixture[expectedIdentity.user]._id;

        return createIdentity(key, expectedIdentity)
          .then(function(identity) {
            fixture[key] = identity;
          });
      }

      return null;
    });

    return Promise.all(promises).then(function() { return fixture; });
  }

  function createTroupes(fixture) {
    var promises = Object.keys(expected).map(function(key) {

      if(key.match(/^troupe/)) {
        var expectedTroupe = expected[key];

        expectedTroupe.userIds = expectedTroupe.users && expectedTroupe.users.map(function(user) {
          return fixture[user]._id;
        });

        var expectedSecurityDescriptor = expectedTroupe && expectedTroupe.securityDescriptor;
        if (expectedSecurityDescriptor) {
          expectedSecurityDescriptor.extraMembers = expectedSecurityDescriptor.extraMembers && expectedSecurityDescriptor.extraMembers.map(function(user) {
            return fixture[user]._id;
          });

          expectedSecurityDescriptor.extraAdmins = expectedSecurityDescriptor.extraAdmins && expectedSecurityDescriptor.extraAdmins.map(function(user) {
            return fixture[user]._id;
          });
        }


        return createTroupe(key, expectedTroupe)
          .then(function(troupe) {
            fixture[key] = troupe;
          });
      }

      return null;
    });

    return Promise.all(promises).then(function() { return fixture; });
  }


  function createInvites(fixture) {
    var promises = Object.keys(expected).map(function(key) {

        if(key.match(/^invite/)) {
          var expectedInvite = expected[key];

          expectedInvite.fromUserId = fixture[expectedInvite.fromUser]._id;
          expectedInvite.userId = expectedInvite.user && fixture[expectedInvite.user]._id;
          expectedInvite.troupeId = expectedInvite.troupe && fixture[expectedInvite.troupe]._id;

          if(expectedInvite.email === true) {
            expectedInvite.email = generateEmail();
          }

          if(expectedInvite.code === true) {
            expectedInvite.code = "confirm" + Math.random();
          }
          return createInvite(key, expectedInvite)
            .then(function(invite) {
              fixture[key] = invite;
            });
        }

        return null;
      });
    return Promise.all(promises)
      .thenReturn(fixture);
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

    return Promise.all(promises).then(function() { return fixture; });
  }

  return createUsers(createBaseFixture())
    .then(createIdentities)
    .then(createTroupes)
    .then(createInvites)
    .then(createMessages)
    .nodeify(done);
}

function fixtureLoader(fixture, expected) {
  debug("Creating fixtures %j", expected);
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

fixtureLoader.setup = function(expected) {
  var fixture = {};

  before(fixtureLoader(fixture, expected));
  after(function() {
    if (fixture.cleanup) {
      fixture.cleanup();
    }
  });

  return fixture;
};

fixtureLoader.use = function(expected) {
  return createExpectedFixtures(expected);
};

fixtureLoader.generateEmail = generateEmail;
fixtureLoader.generateGithubId = generateGithubId;
module.exports = fixtureLoader;
