/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GithubMe        = require("./github/github-me-service");
var GithubOrg       = require("./github/github-org-service");
var GithubRepo      = require("./github/github-repo-service");
var persistence     = require("./persistence-service");
var Q               = require('q');
var winston         = require('../utils/winston');

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

  var gHuser  = new GithubMe(user);
  var ghRepo  = new GithubRepo(user);
  var gHorg   = new GithubOrg(user);

  // Fetch all user repos and repos of the orgs he belongs to.
  return Q.all([
      ghRepo.getRepos(),
      gHuser.getOrgs()
        .then(function(orgs) {
          return Q.all(orgs.map(function(org) {
            return gHorg.getRepos(org.login);
          }));
        })
    ]).spread(function(userRepos, orgsWithRepos) {
      var repoFilters = [];

      if(adminAccessOnly) {
        repoFilters.push(function(r) { return r.permissions.admin; });
      }

      // Filter out what needs filtering out
      var filteredUserRepos = applyFilters(userRepos, repoFilters);

      var orgRepos = orgsWithRepos.reduce(function(memo, org) { memo.push.apply(memo, org); return memo; }, []);
      var filteredOrgRepos = applyFilters(orgRepos, repoFilters);

      filteredUserRepos.push.apply(filteredUserRepos, filteredOrgRepos);

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
  if(!filters.length) return Q.resolve([]);

  return persistence.Troupe
    .find({
      $and: filters.map(function(re) {
        return { lcUri: re };
      }),
      githubType: 'REPO',
      security: 'PUBLIC'
    })
    .limit(20)
    .execQ()
    .then(function(troupes) {
      return Q.all(troupes.map(function(troupe) {
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
      }));
    })
    .then(function(troupes) {
      return troupes.filter(function(f) { return !!f; });
    });
}

exports.findPublicReposWithRoom = findPublicReposWithRoom;


function findReposByUris(uris) {
  if(uris.length === 0) return Q.resolve([]);

  uris = uris.map(function(r) {
    return r && r.toLowerCase();
  });

  winston.info("Querying findReposByUris for " + uris.length + " repositories");
  return persistence.Troupe.findQ({
      githubType: 'REPO',
      lcUri: { $in: uris }
    }, {
      uri: 1,
      githubId: 1,
      security: 1
    })
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
