'use strict';

/**
 * @deprecated
 * TODO: remove this
 */
function isGitHubUsername(username) {
  return username && username.indexOf('_') < 0;
}

module.exports = isGitHubUsername;
