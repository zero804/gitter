'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var Forum = require('gitter-web-persistence').Forum;
var validateForum = require('./validate-forum');


function findById(forumId) {
  return Forum.findById(forumId)
    .lean()
    .exec();
}

function createForum(user, forumInfo, securityDescriptor) {
  // we can't upsert because there's nothing unique on a Forum to check against
  var data = {
    tags: forumInfo.tags || [],
    sd: securityDescriptor
  };

  return Promise.try(function() {
      return validateForum(data);
    })
    .then(function(insertData) {
      return Forum.create(insertData)
        .then(function(forum) {
          stats.event('new_forum', {
            // TODO: groupId would probably have been handy here? But leaky.
            forumId: forum._id,
            userId: user._id
          });

          return forum;
        });
    });
}

module.exports = {
  findById: findById,
  createForum: createForum
};
