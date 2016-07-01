'use strict';

var avatarCdnResolver = require('../shared/avatar-cdn-resolver');
var DEFAULT = 'https://avatars.githubusercontent.com/u/0';

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
  if (!uri) return DEFAULT;
  var orgOrUser = uri.split('/')[0];
  return avatarCdnResolver('/gh/u/' + orgOrUser);
}

/**
 * This will change in future.
 */
function getForUser(user) {
  if (!user) return DEFAULT;
  var username = user.username;
  if (!username) return DEFAULT;
  var gv = user.gv;

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
