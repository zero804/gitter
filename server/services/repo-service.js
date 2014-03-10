/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GithubMe        = require("./github/github-me-service");
var GithubOrg       = require("./github/github-org-service");
var GithubRepo      = require("./github/github-repo-service");
var persistence     = require("./persistence-service");
var Q               = require('q');
var lazy            = require('lazy.js');
var moment          = require('moment');
var winston         = require('winston');

var SCORE_STARRED = 50;
var SCORE_WATCHED = 100;
var SCORE_OWN = 500;
var SCORE_PUSH = 1500;
var SCORE_ADMIN = 3000;
var SCORE_RECENT = 5000;
var SCORE_EXISTING = 5000;

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

function findReposWithRooms(repoList) {
  var orTerms = lazy(repoList)
                  .map(function(r) { return { lcUri: r && r.toLowerCase(), githubType: 'REPO' }; })
                  .toArray();

  winston.info("Querying reposWithRooms for " + orTerms.length + " repositories");
  var roomsPromise = orTerms.length ? persistence.Troupe.findQ({ $or: orTerms }, "uri") : Q.resolve([]);
  return roomsPromise;
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
                .take(20)
                .toArray();
    });

}
exports.suggestedReposForUser = suggestedReposForUser;

function findPublicReposWithRoom(user, query, options) {
  if(!options) options = {};

  var ghRepo  = new GithubRepo(user);
  var q = new RegExp(query, 'i');
  return persistence.Troupe.findQ({lcUri: q, githubType: 'REPO'}).then(function(troupes) {
    return Q.all(troupes.map(function(troupe) { return ghRepo.getRepo(troupe.uri); })).then(function(repos) {
      return repos.filter(function(repo) { return repo ? !repo.private : null; });
    });
  });
}

exports.findPublicReposWithRoom = findPublicReposWithRoom;
