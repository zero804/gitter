'use strict';

var isGitHubUser = require('../shared/is-github-user');
var avatarCdnResolver = require('../shared/avatar-cdn-resolver');
var gravatar = require('./gravatar');

var DEFAULT = 'https://avatars.githubusercontent.com/u/0';

function getForGitHubUsername(githubUsername) {
  return avatarCdnResolver('/gh/u/' + githubUsername);
}

function getForGravatarEmail(emailAddress) {
  var hash = gravatar.hashEmail(emailAddress);
  return avatarCdnResolver('/gravatar/m/' + hash);
}

function getForGroupId(groupId) {
  return avatarCdnResolver('/group/i/' + groupId);
}

/**
 * This will change in future
 */
function getForRoomUri(uri) {
  if (!uri) return DEFAULT;
  var orgOrUser = uri.split('/')[0];
  return avatarCdnResolver('/gh/u/' + orgOrUser);
}

/**
 * This will change in future
 */
function getForUser(user) {
  if (!user) return DEFAULT;
  var username = user.username;
  if (!username) return DEFAULT;

  if (!isGitHubUser(user)) {
    // In future, all users will be routed here
    // Get our services to resolve the user
    return avatarCdnResolver('/g/u/' + username);
  }

  var gv = user.gravatarVersion || user.gv;

  if (gv) {
    // Use the versioned interface
    return avatarCdnResolver('/gh/uv/' + gv + '/' + username);
  } else {
    // Use the unversioned interface, with a shorter cache time
    return avatarCdnResolver('/gh/u/' + username);
  }
}

function getDefault() {
  return DEFAULT;
}

module.exports = {
  getForGitHubUsername: getForGitHubUsername,
  getForGravatarEmail: getForGravatarEmail,
  getForGroupId: getForGroupId,
  getForRoomUri: getForRoomUri,
  getForUser: getForUser,
  getDefault: getDefault,
}
