/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GithubMe        = require("./github/github-me-service");
var GithubOrg       = require("./github/github-org-service");
var GithubRepo      = require("./github/github-repo-service");
var persistence     = require("./persistence-service");
var Q               = require('q');
var lazy            = require('lazy.js');
var moment          = require('moment');
var winston         = require('../utils/winston');

var SCORE_STARRED = 50;
var SCORE_WATCHED = 100;
var SCORE_OWN = 500;
var SCORE_PUSH = 1500;
var SCORE_ADMIN = 3000;
var SCORE_RECENT = 5000;
var SCORE_EXISTING = 5000;
var SCORE_ROOM_PER_USER = 300;

var WATCHER_COEFFICIENT = 0.1;
var FORK_COEFFICIENT = 0.3;
var STAR_GAZER_COEFFICIENT = 0.05;

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

function calculateAdditionalScoreFor(item) {
  var score = item.score;
  var repo = item.repo;
  score += repo.watchers_count * WATCHER_COEFFICIENT;
  if(!repo.fork) {
    score += repo.forks_count * FORK_COEFFICIENT;
  }
  score += repo.stargazers_count * STAR_GAZER_COEFFICIENT;

  if(repo.pushed_at) {
    var duration = moment.duration(moment().diff(repo.pushed_at));
    var minsSincePush = duration.asMinutes();
    // 10080 = minutes in a week
    // therefore, repos with no commits with one week will get half the score
    score += SCORE_RECENT * 10080 / (10080 + minsSincePush);
  }

  if(repo.permissions) {
    if(repo.permissions.admin) score += SCORE_ADMIN;
    if(repo.permissions.push) score += SCORE_PUSH;
  }

  return score;
}

/* This seems to be a very badly performing query! */
function findReposWithRooms(repoList) {
  if(repoList.length === 0) return Q.resolve([]);

  var uris = repoList.map(function(r) {
    return r && r.toLowerCase();
  });

  winston.info("Querying reposWithRooms for " + uris.length + " repositories");

  return persistence.Troupe.findQ({
      githubType: 'REPO',
      lcUri: { $in: uris }
    }, { uri: 1, users: 1 });
}

function suggestedReposForUser(user) {

  function map(score) {
    return function(repos) {
      return repos.map(function(repo) {
        return {
          score: score,
          repo: repo
        };
      });
    };
  }

  var ghRepo  = new GithubRepo(user);
  return Q.all([
      // ghRepo.getStarredRepos().then(map(SCORE_STARRED)),
      ghRepo.getWatchedRepos().then(map(SCORE_WATCHED)),
      getReposForUser(user).then(map(SCORE_OWN))
    ])
    .then(function(all) {
      return lazy(all)
              .flatten()
              .reduce(function(scores, item) {
                var s = scores[item.repo.full_name];
                var additionalScore = calculateAdditionalScoreFor(item);
                if(!s) {
                  s = { score: additionalScore, repo: item.repo };
                  scores[item.repo.full_name] = s;
                } else {
                  s.score += additionalScore;
                }
                return scores;
              }, {});
    })
    .then(function(scores) {
      return findReposWithRooms(Object.keys(scores))
        .then(function(troupes) {
          troupes.forEach(function(troupe) {
            var s = scores[troupe.uri];
            if(s) {
              s.score += SCORE_EXISTING;
              s.score += troupe.users.length * SCORE_ROOM_PER_USER;
            }
          });

          var troupesByUri = lazy(troupes)
            .reduce(function(memo, v) { memo[v.uri] = v; return memo; }, {});

          return lazy(scores)
            .pairs()
            .filter(function(a) {
              var uri = a[0];
              var value = a[1];
              var repo = value.repo;

              var existingTroupe = troupesByUri[uri];

              // If a troupe exists, always let it through
              // TODO: check permissions in future
              if(existingTroupe) return true;

              if(repo.permissions && repo.permissions.admin) return true;

              return false;
            })
            .toObject();
        });
    })
    .then(function(scores) {
        return lazy(scores)
                .pairs()
                .sortBy(function(a) {
                  return a[1].score;
                })
                .reverse()
                .map(function(a) {
                  return a[1].repo;
                })
                .take(6)
                .toArray();
    });

}
exports.suggestedReposForUser = suggestedReposForUser;

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
      $or: [
        { security: 'PUBLIC' },
        { security: null },
        { security: { $exists: false } }
      ]
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