'use strict';

var Promise = require('bluebird');
var Forum = require('gitter-web-persistence').Forum;
var debug = require('debug')('gitter:tests:test-fixtures');



function createForum(fixtureName, f) {
  debug('Creating %s', fixtureName);

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
    extraMembers: securityDescriptor.extraMembers,
    extraAdmins: securityDescriptor.extraAdmins
  };

  var doc = {
    sd: securityDoc
  };

  debug('Creating forum %s with %j', fixtureName, doc);

  return Forum.create(doc);
}


function createExtraForums(expected, fixture, key) {
  var obj = expected[key];
  var forum = obj.forum;
  if (!forum) return;

  if (typeof forum !== 'string') throw new Error('Please specify the forum as a string id');

  if (fixture[forum]) {
    // Already specified at the top level
    obj.forum = fixture[forum];
    return;
  }

  debug('creating extra forum %s', forum);

  return createForum(forum, {})
    .then(function(createdForum) {
      obj.forum = createdForum;
      fixture[forum] = createdForum;
    });
}

function createForums(expected, fixture) {
  // Create forums
  return Promise.map(Object.keys(expected), function(key) {
    if (key.match(/^forum/)) {
      var expectedForum = expected[key];

      var expectedSecurityDescriptor = expectedForum && expectedForum.securityDescriptor;
      if (expectedSecurityDescriptor) {
        expectedSecurityDescriptor.extraMembers = expectedSecurityDescriptor.extraMembers && expectedSecurityDescriptor.extraMembers.map(function(user) {
          return fixture[user]._id;
        });

        expectedSecurityDescriptor.extraAdmins = expectedSecurityDescriptor.extraAdmins && expectedSecurityDescriptor.extraAdmins.map(function(user) {
          return fixture[user]._id;
        });
      }

      return createForum(key, expectedForum)
        .then(function(createdForum) {
          debug('setting %s', key);
          fixture[key] = createdForum;
        });
    }

    return null;
  })
  .then(function() {
    return Promise.map(Object.keys(expected), function(key) {
      if (key.match(/^(group|category|topic|reply|comment)/)) {
        return createExtraForums(expected, fixture, key);
      }

      return null;
    });
  });
}

module.exports = createForums;
