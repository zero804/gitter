'use strict';

var Q = require('q');
var userScopes = require('../utils/models/user-scopes');

var registeredBackends = {
  google: require('../backends/google'),
  github: require('../backends/github'),
  // ...
};


function resolveBackendForProvider(provider) {
  return registeredBackends[provider];
}

function resolveUserBackends(user) {
  var userBackends = [];
  if (userScopes.isGitHubUser(user)) {
    userBackends.push(resolveBackendForProvider('github'));
  }
  if (user.identities) {
    user.identities.forEach(function(identity) {
      userBackends.push(resolveBackendForProvider(identity.provider));
    });
  }
  return userBackends;
}

/*
backendResolver.findAllResults(user, 'getEmailAddress') -> [array of email addresses]
backendResolver.findAllResults(user, 'getOrgs') -> [array of arrays of orgs]

user.getOrgs() or userScopes.getOrgs(user) could just use this, but would have
to concatenate things itself.
*/
function findAllResults(user, method, args) {
  args = args || [];

  var userBackends = resolveUserBackends(user);
  var promises = userBackends.map(function(backend) {
    return backend[method].apply(backend, args);
  });
  return Q.all(promises)
}

/*
backendResolver.getFirstResult(user, 'getEmailAddress') -> email address or undefined
user.getEmailAddress() or userScopes.getEmailAddress(user) could use this.
*/
function getFirstResult(user, method, args) {
  args = args || [];

  var userBackends = resolveUserBackends(user);
  var deferred = Q.defer();

  function tryNext() {
    var nextBackend = userBackends.shift();
    if (nextBackend) {
      nextBackend[method].apply(nextBackend, args)
        .then(function(result) {
          if (result) {
            deferred.resolve(result);
          } else {
            tryNext();
          }
        })
        .catch(function(err) {
          deferred.reject(err);
        });
    } else {
      deferred.resolve(); // with an empty value
    }
  }

  tryNext();

  return deferred.promise;
}


module.exports = {
  registeredBackends: registeredBackends,
  resolveBackendForProvider: resolveBackendForProvider,
  resolveUserBackends: resolveUserBackends,
  findAllResults: findAllResults,
  getFirstResult: getFirstResult
};
