'use strict';

var isGitHubUser = require('../shared/is-github-user');
var avatarCdnResolver = require('../shared/avatar-cdn-resolver');

var DEFAULT = require('url?limit=1024!../../../public/images/default-avatar.png'); // eslint-disable-line

function getForGitHubUsername(githubUsername) {
  return avatarCdnResolver('/gh/u/' + githubUsername);
}

function getForGravatarEmail(emailAddress) {
  return avatarCdnResolver('/gravatar/e/' + emailAddress);
}

function getForGroupId(groupId) {
  return avatarCdnResolver('/group/i/' + groupId);
}

/**
 * This will change in future
 */
function getForRoomUri(uri) {
  if (!uri) return null;
  var orgOrUser = uri.split('/')[0];
  return avatarCdnResolver('/gh/u/' + orgOrUser);
}

/**
 * This will change in future.
 */
function getForUser(user) {
  if (!user) return null;
  var username = user.username;
  if (!username) return null;
  var gv = user.gv;

  if (!isGitHubUser(user)) {
    // In future, all users will be routed here
    // Get our services to resolve the user
    return avatarCdnResolver('/g/u/' + username);
  }

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
