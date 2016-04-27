'use strict';

var LEGACY_DEFAULT_SCOPE = {'user': 1, 'user:email': 1, 'user:follow':1, 'repo':1, 'public_repo': 1};

exports.hasGitHubScope = function(user, scope) {
  var githubToken = user.githubToken;
  var githubScopes = user.githubScopes;
  var githubUserToken = user.githubUserToken;

  if(!githubUserToken && !githubToken) {
    return false;
  }

  // Get the simple case out the way
  if(githubUserToken && (scope === 'user' ||
             scope === 'user:email'||
             scope === 'user:follow')) {
    return true;
  }

  function hasScope() {
    for(var i = 0; i < arguments.length; i++) {
      if(githubScopes[arguments[i]]) return true;
    }
    return false;
  }

  if(!githubScopes) {
    if(githubToken) {
      return !!LEGACY_DEFAULT_SCOPE[scope];
    }
    // Legacy users will need to reauthenticate unfortunately
    return false;
  }

  // Crazy github rules codified here....
  switch(scope) {
    case 'notifications': return hasScope('notifications', 'repo');
    case 'user:follow': return hasScope('user:follow', 'user');
    case 'user:email': return hasScope('user:email', 'user');
    case 'public_repo': return hasScope('public_repo', 'repo');
    case 'repo:status': return hasScope('repo:status', 'repo');
  }

  // The less crazy case
  return !!githubScopes[scope];
};

exports.getGitHubScopes = function(user) {
  if(!user.githubScopes) {
    if(user.githubUserToken) {
      return Object.keys(LEGACY_DEFAULT_SCOPE);
    } else {
      return [];
    }
  }

  var scopes = Object.keys(user.githubScopes);
  if(!user.githubUserToken) {
    return scopes;
  }

  return scopes.concat(['user', 'user:email', 'user:follow']);
};

exports.getGitHubToken = function(user, scope) {
  if(!scope) return user.githubToken || user.githubUserToken;

  switch(scope) {
    case 'user':
    case 'user:email':
    case 'user:follow':
      return user.githubUserToken || user.githubToken;
  }

  return user.githubToken || user.githubUserToken;
};

function isGitHubUser(user) {
  return (user.username && user.username.indexOf('_') === -1);
}
exports.isGitHubUser = isGitHubUser;

exports.isMissingTokens = function(user) {
  // TODO: replace this with something more "provider-aware"
  // non-github users cannot miss their github tokens
  if (!isGitHubUser(user)) return false;
  return !user.githubToken && !user.githubUserToken;
};

exports.REQUIRED_FIELDS = { githubToken: 1, githubUserToken: 1, githubScopes: 1 };

exports.getIdentities = function(user) {
  // Just the provider name and id. Basically user.identities, but also
  // including github. If you want the full identities, use identityService
  // rather.
  var identities = [];
  if (isGitHubUser(user)) {
    identities.push({ provider: 'github', providerKey: user.githubId });
  }
  if (user.identities) {
    identities.push.apply(identities, user.identities);
  }
  return identities;
};
