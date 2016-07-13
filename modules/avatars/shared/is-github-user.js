'use strict';

/**
 * Nasty bridge
 * @deprecated
 */
function isGitHubUser(user) {
  if (!user || !user.username) return false;
  if (user.username.indexOf('_') >= 0) return false;
  return true;
}

module.exports = isGitHubUser;
