'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Forum = require('gitter-web-persistence').Forum;
var debug = require('debug')('gitter:app:topics:forum-service');

function createForum(user, forumInfo, securityDescriptor) {
  // we can't upsert because there's nothing unique on a Forum to check against
  var insertData = {
    tags: forumInfo.tags || [],
    sd: securityDescriptor
  };
  return Forum.create(insertData)
    .then(function(forum) {
      stats.event('new_forum', {
        // TODO: groupId would probably have been handy here? But leaky.
        forumId: forum._id,
        userId: user._id
      });

      return forum;
    });
}

module.exports = {
  createForum: createForum
};
