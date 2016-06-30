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

function getDefault() {
  return DEFAULT;
}

module.exports = {
  getForGitHubUsername: getForGitHubUsername,
  getForGravatarEmail: getForGravatarEmail,
  getForGroupId: getForGroupId,
  getForRoomUri: getForRoomUri,
  getDefault: getDefault,
}
