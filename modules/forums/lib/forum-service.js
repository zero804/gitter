'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var Promise = require('bluebird');
var assert = require('assert');
var StatusError = require('statuserror');
var Forum = require('gitter-web-persistence').Forum;
var debug = require('debug')('gitter:app:forums:forum-service');


function createForum(user, forumInfo) {
  // we can't upsert because there's nothing unique on a Forum to check against
  return Forum.create(forumInfo)
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
