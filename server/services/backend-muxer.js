'use strict';

var Q = require('bluebird-q');
var userScopes = require('../utils/models/user-scopes');
var identityService = require('./identity-service');

var registeredBackends = {
  google: require('gitter-web-google-backend'),
  github: require('gitter-web-github-backend'),
  twitter: require('gitter-web-twitter-backend'),
  linkedin: require('gitter-web-linkedin-backend'),
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

function BackendMuxer(user) {
  this.user = user;
}

// Use this when each Backend returns an object or value and you just want them
// all as one array.
BackendMuxer.prototype.findResults = function(method, args) {
  args = args || [];

  return resolveUserBackends(this.user)
    .then(function(userBackends) {
      var promises = userBackends.map(function(backend) {
        return backend[method].apply(backend, args);
      });
      return Q.all(promises);
    })
};

// Use this when each backend returns an array and you want to concatenate them
// all into one array.
BackendMuxer.prototype.findAllResults = function(method, args) {
  return this.findResults(method, args)
    .then(function(arrays) {
      return Array.prototype.concat.apply([], arrays);
    });
};

// Try the backends one by one and return the first one that returns a result's
// result.
BackendMuxer.prototype.getFirstResult = function(method, args) {
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

BackendMuxer.prototype.getEmailAddress = function(preferStoredEmail) {
  return this.getFirstResult('getEmailAddress', [preferStoredEmail]);
};

BackendMuxer.prototype.findOrgs = function() {
  return this.findAllResults('findOrgs');
};

BackendMuxer.prototype.findProfiles = function() {
  return this.findResults('getProfile');
};

module.exports = BackendMuxer;
