"use strict";

var GithubRepo  = require('gitter-web-github').GitHubRepoService;
var persistence = require('./persistence-service');
var Promise     = require('bluebird');
var winston     = require('../utils/winston');

function applyFilters(array, filters) {
  // Filter out what needs filtering out
  return filters.reduce(function(memo, filter) {
      return memo.filter(filter);
    }, array);
}

/**
 * Gets a list of repos for a user
 * @returns The promise of a list of repos for the user
 */
function getReposForUser(user, options) {
  if(!options) options = {};
  var adminAccessOnly = 'adminAccessOnly' in options ? options.adminAccessOnly : false;

  var ghRepo  = new GithubRepo(user);

  return ghRepo.getAllReposForAuthUser()
    .then(function(userRepos) {
      var repoFilters = [];

      if(adminAccessOnly) {
        repoFilters.push(function(r) { return r.permissions.admin; });
      }

      // Filter out what needs filtering out
      var filteredUserRepos = applyFilters(userRepos, repoFilters);
      filteredUserRepos.sort(function(a,b) { return Date.parse(b.pushed_at) - Date.parse(a.pushed_at); });

      return filteredUserRepos;
    });
}
exports.getReposForUser = getReposForUser;

function createRegExpsForQuery(queryText) {
  var normalized = ("" + queryText).trim().toLowerCase();
  var parts = normalized.split(/[\s\'']+/)
                        .filter(function(s) { return !!s; })
                        .filter(function(s, index) { return index < 10; } );

  return parts.map(function(i) {
    return new RegExp("\\b" + i.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
  });
}


function findPublicReposWithRoom(user, query, options) {
  if(!options) options = {};

  var ghRepo  = new GithubRepo(user);

  var filters = createRegExpsForQuery(query);
  if(!filters.length) return Promise.resolve([]);

  return persistence.Troupe
    .find({
      $and: filters.map(function(re) {
        return { lcUri: re };
      }),
      githubType: 'REPO',
      security: 'PUBLIC'
    })
    .limit(options.limit || 20)
    .exec()
    .then(function(troupes) {
      return Promise.map(troupes, function(troupe) {
        if(troupe.security === 'PUBLIC') {
          return troupe;
        }
        if(troupe.security) return null;

        return ghRepo.getRepo(troupe.uri)
          .then(function(repo) {
            if(!repo) return null;

            if(repo.private) {
              return null;
            }

            return troupe;
          });
      });
    })
    .then(function(troupes) {
      return troupes.filter(function(f) { return !!f; });
    });
}

exports.findPublicReposWithRoom = findPublicReposWithRoom;


function findReposByUris(uris) {
  if(uris.length === 0) return Promise.resolve([]);

  uris = uris.map(function(r) {
    return r && r.toLowerCase();
  });

  winston.info("Querying findReposByUris for " + uris.length + " repositories");
  return persistence.Troupe.find({
      githubType: 'REPO',
      lcUri: { $in: uris }
    }, {
      uri: 1,
      githubId: 1,
      security: 1
    })
    .exec()
    .then(function(troupes) {
      return troupes.map(function(t) {
        return {
          full_name: t.uri,
          private: t.security === 'PRIVATE'
        };
      });
    });
}
exports.findReposByUris = findReposByUris;
