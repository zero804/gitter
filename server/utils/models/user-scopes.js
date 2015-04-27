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


exports.isMissingTokens = function(user) {
  return !user.githubToken && !user.githubUserToken;
};

exports.REQUIRED_FIELDS = { githubToken: 1, githubUserToken: 1, githubScopes: 1 };
