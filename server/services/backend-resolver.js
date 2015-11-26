'use strict';

var Q = require('q');
var userScopes = require('../utils/models/user-scopes');
var identityService = require('./identity-service');

var registeredBackends = {
  google: require('../backends/google'),
  github: require('../backends/github'),
  // ...
};

function resolveBackendForProvider(provider) {
  return registeredBackends[provider];
}

function resolveUserBackends(user) {
  return identityService.findForUser(user)
    .then(function(identities) {
      return identities.reduce(function(map, identity) {
        map[identity.provider] = identity;
        return map;
      }, {});
    })
    .then(function(identityMap) {
      var userBackends = [];
      if (userScopes.isGitHubUser(user)) {
        var Backend = resolveBackendForProvider('github');
        userBackends.push(new Backend(user, identityMap['github']));
      }
      if (user.identities) {
        user.identities.forEach(function(identity) {
          var Backend = resolveBackendForProvider(identity.provider);
          userBackends.push(new Backend(user, identityMap[identity.provider]));
        });
      }
      return userBackends;
    });
}

function BackendResolver(user) {
  this.user = user;
}

BackendResolver.prototype.findAllResults = function(method, args) {
  args = args || [];

  return resolveUserBackends(this.user)
    .then(function(userBackends) {
      var promises = userBackends.map(function(backend) {
        return backend[method].apply(backend, args);
      });
      return Q.all(promises);
    })
    .then(function(arrays) {
      return Array.prototype.concat.apply([], arrays);
    });
};

BackendResolver.prototype.getFirstResult = function(method, args) {
  args = args || [];

  return resolveUserBackends(this.user)
    .then(function(userBackends) {
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
    });
};

BackendResolver.prototype.getEmailAddress = function(preferStoredEmail) {
  return this.getFirstResult('getEmailAddress', [preferStoredEmail]);
};

BackendResolver.prototype.getSerializedOrgs = function() {
  return this.findAllResults('getSerializedOrgs');
};

BackendResolver.prototype.getProfile = function() {
  return this.getFirstResult('getProfile');
};

module.exports = BackendResolver;
