"use strict";

var Promise = require('bluebird');
var persistence = require('gitter-web-persistence');
var uuid = require('node-uuid');
var debug = require('debug')('gitter:tests:test-fixtures');
var counter = 0;

var seed = Date.now();

// This corresponds with require("/services/room-membership-flags").MODES.all
var DEFAULT_ROOM_MEMBERSHIP_FLAGS = 109;

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

function generateGroupUri() {
  return '_group' + (++counter) + Date.now();
}

function createBaseFixture() {
  return {
    generateEmail: generateEmail,
    generateName: generateName,
    generateUri: generateUri,
    generateUsername: generateUsername,
    generateGithubId: generateGithubId,
    generateGithubToken: generateGithubToken,
    generateGroupUri: generateGroupUri,

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

function createExpectedFixtures(expected) {
  if (!expected) throw new Error('Please provide a fixture')
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

    var promise = persistence.User.create({
      identities:       f.identities,
      displayName:      possibleGenerate('displayName', generateName),
      githubId:         possibleGenerate('githubId', generateGithubId),
      githubToken:      possibleGenerate('githubToken', generateGithubToken),
      username:         possibleGenerate('username', generateUsername),
      state:            f.state || undefined,
      staff:            f.staff || false
    });

    if (f.accessToken) {
      promise = promise.tap(function(user) {
        return persistence.OAuthClient.findOne({ clientKey: f.accessToken })
          .then(function(client) {
            if (!client) throw new Error('Client not found clientKey=' + f.accessToken);

            var token = '_test_' + uuid.v4();
            return persistence.OAuthAccessToken.create({
              token: token,
              userId: user._id,
              clientId: client._id,
              expires: new Date(Date.now() + 60 * 60 * 1000)
            })
            .then(function() {
              user.accessToken = token;
            });
          });
      });
    }

    return promise;
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
          flags = DEFAULT_ROOM_MEMBERSHIP_FLAGS;
          lurk = false;
        }

        bulk.find({ troupeId: troupeId, userId: userId })
          .upsert()
          .updateOne({
            $set: { flags: flags, lurk: lurk },
            $setOnInsert: { troupeId: troupeId, userId: userId }
          });
      });

      return Promise.fromCallback(function(callback) {
        bulk.execute(callback);
      });
  }

  function generateSecurityDescriptorForTroupeFixture(f) {
    var securityDescriptor = f.securityDescriptor || {};

    var securityDescriptorType;
    if (securityDescriptor.type) {
      securityDescriptorType = securityDescriptor.type;
    } else {
      securityDescriptorType = f.oneToOne ? 'ONE_TO_ONE' : null;
    }

    return {
      // Permissions stuff
      type: securityDescriptorType,
      members: securityDescriptor.members || 'PUBLIC',
      admins: securityDescriptor.admins || 'MANUAL',
      public: 'public' in securityDescriptor ? securityDescriptor.public : !f.oneToOne,
      linkPath: securityDescriptor.linkPath,
      externalId: securityDescriptor.externalId,
      extraMembers: securityDescriptor.extraMembers,
      extraAdmins: securityDescriptor.extraAdmins
    };
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

    var groupId = f.group && f.group._id;

    var doc = {
      uri: uri,
      lcUri: lcUri,
      githubId: f.githubId === true ? generateGithubId() : f.githubId || null,
      groupId: groupId,
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

    doc.sd = generateSecurityDescriptorForTroupeFixture(f);

    debug('Creating troupe %s with %j', fixtureName, doc);
    return persistence.Troupe.create(doc)
      .tap(function(troupe) {
        if (!f.userIds || !f.userIds.length) return;
        return bulkInsertTroupeUsers(troupe._id, f.userIds, f.membershipStrategy);
      });
  }

  function createGroup(fixtureName, f) {
    debug('Creating %s', fixtureName);

    var uri = f.uri || generateGroupUri();

    var doc = {
      name: f.name || uri,
      uri: uri,
      lcUri: uri.toLowerCase()
    };


    var securityDescriptor = f.securityDescriptor || {};

    var securityDescriptorType;
    if (securityDescriptor.type) {
      securityDescriptorType = securityDescriptor.type;
    } else {
      securityDescriptorType = null;
    }

    var securityDoc = {
      // Permissions stuff
      type: securityDescriptorType,
      members: securityDescriptor.members || 'PUBLIC',
      admins: securityDescriptor.admins || 'MANUAL',
      public: 'public' in securityDescriptor ? securityDescriptor.public : true,
      linkPath: securityDescriptor.linkPath,
      externalId: securityDescriptor.externalId,
      extraMembers: undefined,
      extraAdmins: undefined
    };

    doc.sd = securityDoc;

    debug('Creating group %s with %j', fixtureName, doc);

    debug(doc);

    return persistence.Group.create(doc);
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

  function deleteDocuments() {
    var d = expected.deleteDocuments;
    if (!d) return;

    // This *REALLY* mustn't get run in the wrong environments
    if (process.env.NODE_ENV === 'beta' || process.env.NODE_ENV === 'prod') {
      throw new Error('https://cdn.meme.am/instances/400x/52869867.jpg')
    }

    return Promise.map(Object.keys(d), function(key) {
      var queries = d[key];
      return Promise.map(queries, function(query) {

        return persistence[key].remove(query).exec();
      });
    })
  }

  function createUsers(fixture) {
    var userCounter = 0;
    return Promise.map(Object.keys(expected), function(key) {

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
  }

  function createIdentities(fixture) {
    return Promise.map(Object.keys(expected), function(key) {
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
  }

  function createGroups(fixture) {
    // Create groups
    return Promise.map(Object.keys(expected), function(key) {
      if(key.match(/^group/)) {
        return createGroup(key, expected[key])
          .then(function(createdGroup) {
            fixture[key] = createdGroup;

            // add specified extra admins
            var f = expected[key];
            var extraAdmins = f.securityDescriptor && f.securityDescriptor.extraAdmins;
            if (extraAdmins) {
              fixture[key].sd.extraAdmins = extraAdmins.map(function(user) {
                return fixture[user]._id;
              });
              return fixture[key].save();
            }
          });
      }
    })
    .then(function() {
      // Attach the groups to the troupes
      return Promise.map(Object.keys(expected), function(key) {
        if(key.match(/^troupe/)) {
          var troupe = expected[key];
          var group = troupe.group;
          if (!group) return;

          if (typeof group !== 'string') throw new Error('Please specify the group as a string id')
          if (fixture[group]) {
            // Already specified at the top level
            troupe.group = fixture[group];
            return
          }

          return createGroup(group, { })
            .then(function(createdGroup) {
              troupe.group = createdGroup;
              fixture[group] = createdGroup;
            });
        }
      });
    });
  }

  function createTroupes(fixture) {
    return Promise.map(Object.keys(expected), function(key) {

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
  }

  function createMessages(fixture) {
    return Promise.map(Object.keys(expected), function(key) {
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
  }

  return Promise.try(createBaseFixture)
    .tap(deleteDocuments)
    .tap(createUsers)
    .tap(createIdentities)
    .tap(createGroups)
    .tap(createTroupes)
    .tap(createMessages);
}

function fixtureLoader(fixture, expected) {
  debug("Creating fixtures %j", expected);
  return function(done) {
    return createExpectedFixtures(expected)
      .then(function(data) {
         Object.keys(data).forEach(function(key) {
          fixture[key] = data[key];
         });
       })
       .asCallback(done);
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
fixtureLoader.createExpectedFixtures = createExpectedFixtures;
fixtureLoader.generateEmail = generateEmail;
fixtureLoader.generateGithubId = generateGithubId;

fixtureLoader.GITTER_INTEGRATION_USER_SCOPE_TOKEN = '***REMOVED***';
fixtureLoader.GITTER_INTEGRATION_USERNAME = 'gitter-integration-tests';
fixtureLoader.GITTER_INTEGRATION_USER_ID = '19433197';
fixtureLoader.GITTER_INTEGRATION_ORG = 'gitter-integration-tests-organisation';
fixtureLoader.GITTER_INTEGRATION_ORG_ID = '19433202';
fixtureLoader.GITTER_INTEGRATION_REPO = 'public-repo-1';
fixtureLoader.GITTER_INTEGRATION_REPO_ID = '59505414';
fixtureLoader.GITTER_INTEGRATION_COMMUNITY = '_I-heart-cats-Test-LOL';
fixtureLoader.GITTER_INTEGRATION_ROOM = 'all-about-kitty-litter';

module.exports = fixtureLoader;
