/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var repoService     = require('./repo-service');
var GithubRepo      = require("./github/github-repo-service");
var persistence     = require("./persistence-service");
var Q               = require('q');
var lazy            = require('lazy.js');
var moment          = require('moment');
var winston         = require('../utils/winston');
var _               = require('underscore');

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

var BILLY_NO_MATES_ROOMS = ['gitterHQ/gitter', 'marionettejs/backbone.marionette'];

function calculateScore(item) {
  // force billy no mates rooms to only show if there is nothing else
  if(item.billy_no_mates) return 0;

  var score = 0;
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

  if(repo.is_watched_by_user) score += SCORE_WATCHED;

  if(repo.is_owned_by_user) score += SCORE_OWN;

  if(item.room) {
    score += SCORE_EXISTING;
    score += item.room.users.length * SCORE_ROOM_PER_USER;
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

function filterSuggestions(suggestions, user) {
  return suggestions.filter(function(suggestion) {
    if(suggestion.room) {
      // it's not a good room suggestion if the user is already in the room
      return !suggestion.room.containsUserId(user.id);
    }

    if(suggestion.repo.permissions && suggestion.repo.permissions.admin) return true;

    return false;

  });
}

function getSuggestions(user) {

  var ghRepo  = new GithubRepo(user);
  return Q.all([
      // ghRepo.getStarredRepos().then(map(SCORE_STARRED)),
      ghRepo.getWatchedRepos(),
      repoService.getReposForUser(user)
    ])
    .spread(function(watchedRepos, ownedRepos) {
      watchedRepos.forEach(function(repo) {
        repo.is_watched_by_user = true;
      });

      ownedRepos.forEach(function(repo) {
        repo.is_owned_by_user = true;
      });

      return watchedRepos.concat(ownedRepos);
    })
    .then(function(repos) {
      return repos.map(function(repo) {
        return { uri: repo.full_name, repo: repo, score: 0 };
      });
    })
    .then(function(suggestions) {

      var uriMap = {};
      var uris = [];

      suggestions.forEach(function(suggestion) {
        uriMap[suggestion.uri] = suggestion;
        uris.push(suggestion.uri);
      });

      BILLY_NO_MATES_ROOMS.forEach(function(roomname) {
        if(uris.indexOf(roomname) < 0) {
          uriMap[roomname] = { uri: roomname, score: 0, billy_no_mates: true };
          uris.push(roomname);
        }
      });

      return findReposWithRooms(uris)
        .then(function(rooms) {
          rooms.forEach(function(room) {
            uriMap[room.uri].room = room;
          });

          return _.values(uriMap);
        });

    })
    .then(function(suggestions) {
      return filterSuggestions(suggestions, user);
    })
    .then(function(suggestions) {
      suggestions.forEach(function(suggestion) {
        suggestion.score = calculateScore(suggestion);
      });

      return suggestions;
    })
    .then(function(suggestions) {
      return suggestions.sort(function(a, b) {
        return b.score - a.score;
      });
    })
    .then(function(suggestions) {
      return suggestions.slice(0, 6);
    });
}

exports.getSuggestions = getSuggestions;

function suggestedReposForUser(user) {
  return getSuggestions(user).then(function(suggestions) {
    return suggestions.map(function(suggestion) {
      return suggestion.repo;
    }).filter(function(repo) {
      return !!repo;
    });
  });
}

exports.suggestedReposForUser = suggestedReposForUser;
