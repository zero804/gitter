'use strict';

var env = require('gitter-web-env');
var config = env.config;
var GitHubUserService = require('gitter-web-github').GitHubUserService;
var extractGravatarVersion = require('gitter-web-avatars/server/extract-gravatar-version');
var Group = require('gitter-web-persistence').Group;

var LOCK_TIMEOUT_SECONDS = 10;

var redisClient = env.ioredis.createClient(config.get('redis_nopersist'), {
  keyPrefix: "avatar-check:"
});

/**
 * Returns true iff the avatar was updated
 */
function groupAvatarUpdater(groupId, githubUsername) {
  return redisClient.set('group:' + groupId, '1', 'EX', LOCK_TIMEOUT_SECONDS, 'NX')
    .bind({
      groupId: groupId,
      githubUsername: githubUsername
    })
    .then(function(result) {
      if (result !== 'OK') return false;
      var githubUserService = new GitHubUserService();
      return githubUserService.getUser(this.githubUsername);
    })
    .then(function(githubUser) {
      if (!githubUser) return false;

      var avatarVersion = extractGravatarVersion(githubUser.avatar_url);
      if (!avatarVersion) return false;

      return Group.update({
        _id: this.groupId,
        avatarVersion: { $lt: avatarVersion }
      }, {
        $max: {
          avatarVersion: avatarVersion,
          avatarCheckedDate: new Date()
        }
      })
      .exec()
      .then(function(result) {
        return result.nModified >= 1;
      });
    })
}


module.exports = groupAvatarUpdater;
