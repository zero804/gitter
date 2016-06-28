'use strict';

var avatarCdnResolver = require('../shared/avatar-cdn-resolver');
var gravatar = require('./gravatar');

function getForGitHubUsername(githubUsername) {
  return avatarCdnResolver('/gh/u/' + githubUsername);
}

function getForGravatarEmail(emailAddress) {
  var hash = gravatar.hashEmail(emailAddress);
  return avatarCdnResolver('/gravatar/m/' + hash);
}

function getDefault() {
  return 'https://avatars.githubusercontent.com/u/0';
}

module.exports = {
  getForGitHubUsername: getForGitHubUsername,
  getForGravatarEmail: getForGravatarEmail,
  getDefault: getDefault,
}
