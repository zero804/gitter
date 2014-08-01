/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var repoService     = require('./repo-service');
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
      repoService.getReposForUser(user).then(map(SCORE_OWN))
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
