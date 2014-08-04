/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var repoService     = require('./repo-service');
var GithubRepo      = require("./github/github-repo-service");
var persistence     = require("./persistence-service");
var Q               = require('q');
var winston         = require('../utils/winston');
var _               = require('underscore');

var HILIGHTED_ROOMS = [{
  uri: 'gitterHQ/gitter',
  lang: 'en'
}, {
  uri: 'marionettejs/backbone.marionette',
  language: 'JavaScript',
  lang: 'en'
},{
  uri: 'LaravelRUS/chat',
  channel: true,
  language: 'PHP',
  lang: 'ru'
}, {
  uri: 'gitterHQ/nodejs',
  chanel: true,
  language: 'JavaScript',
  lang: 'en'
}, {
  uri: 'lotus/chat',
  chanel: true,
  language: 'Ruby',
  lang: 'en'
},{
  uri: 'rom-rb/chat',
  chanel: true,
  language: 'Ruby',
  lang: 'en'
}, {
  uri: 'webpack/webpack',
  language: 'JavaScript',
  lang: 'en'
}, {
  uri: 'ruby-vietnam/chat',
  chanel: true,
  language: 'Ruby',
  lang: 'vi'
}, {
  uri: 'require-lx/group',
  language: 'JavaScript',
  lang: 'en'
}, {
  uri: 'angular-ui/ng-grid',
  language: 'JavaScript',
  lang: 'en'
}, {
  uri: 'opscode/supermarket',
  language: 'Ruby',
  lang: 'en'
}, {
  uri: 'MahApps/MahApps.Metro',
  language: 'PowerShell',
  lang: 'en'
}, {
  uri: 'sympy/sympy',
  language: 'Python',
  lang: 'en'
}, {
  uri: 'rogeriopvl/erebot',
  language: 'JavaScript',
  lang: 'es'
}];

var CATEGORIES = {
  pushTime: function(item) {
    var repo = item.repo;
    if(!repo) return;
    if(!repo.pushed_at) return;
    return new Date(repo.pushed_at).valueOf();
  },
  forks: function(item) {
    var repo = item.repo;
    if(!repo) return;
    return repo.forks_count;
  },
  watchers: function(item) {
    var repo = item.repo;
    if(!repo) return;
    return repo.watchers_count;
  },
  starGazers: function(item) {
    var repo = item.repo;
    if(!repo) return;
    return repo.stargazers_count;
  },
  userCount: function(item) {
    var room = item.room;
    if(!room) return 0;
    return room.users.length;
  },
  isWatchedByUser: function(item) {
    return item.is_watched_by_user ? 1 : 0;
  },
  isStarredByUser: function(item) {
    return item.is_starred_by_user ? 1 : 0;
  },
  programmingLanguage: function(item, context) {
    var language = item.repo && item.repo.language || item.language;
    if(!language) return;
    return context.languageScores[language] || 0;
  },
  userLanguage: function(item, context) {
    if(!context.lang || !item.lang) return;
    return item.lang === context.lang ? 1 : 0;
  },
  highlighted: function(item) {
    return item.highlighted ? 1 : 0;
  }
};

var CATEGORY_COEFFICIENTS = {
  userLanguage: 2
};

function processCategory(name, items, context) {
  var valueFunc = CATEGORIES[name];
  var coefficient = CATEGORY_COEFFICIENTS[name];

  var values = items.map(function(f) {
    return valueFunc(f, context);
  }).filter(function(f) {
    return f !== undefined && f !== null;
  });
  if(!values.length) return;
  var max = _.max(values);
  var min = _.min(values);

  if(max === min) return; // All the values are the same, useless for ranking

  items.forEach(function(item) {
    var score = valueFunc(item, context);
    if(score === undefined || score === null) return;
    var rank = ((score - min) / (max - min)) * 100;
    if(coefficient > 0) {
      rank = rank * coefficient;
    }

    if(!item.scores) item.scores = {};
    item.scores[name] = rank;
    item.score = item.score ? item.score + rank : rank;
    item.categories = item.categories ? item.categories + 1 : 1;
  });
}


/* This seems to be a very badly performing query! */
function findReposWithRooms(repoList) {
  if(repoList.length === 0) return Q.resolve([]);

  var uris = repoList.map(function(r) {
    return r && r.toLowerCase();
  });

  winston.info("Querying reposWithRooms for " + uris.length + " repositories");

  return persistence.Troupe.findQ({
      // githubType: 'REPO',
      lcUri: { $in: uris }
    }, { uri: 1, users: 1 });
}

function filterSuggestions(suggestions, user) {
  return suggestions.filter(function(suggestion) {
    if(suggestion.room) {
      // it's not a good room suggestion if the user is already in the room
      return !suggestion.room.containsUserId(user.id);
    }

    if(!suggestion.repo) return true; // No repo? It's a suggestion

    if(suggestion.repo.permissions && suggestion.repo.permissions.admin) return true;

    return false;

  });
}

function getLanguageScores(suggestions) {
  var result = {};
  suggestions.forEach(function(item) {
    var repo = item.repo;
    if(!repo || !repo.language) return;
    result[repo.language] = result[repo.language] ? result[repo.language] + 1 : 1;
  });

  return result;
}


function getSuggestions(user, lang) {

  var ghRepo  = new GithubRepo(user);
  return Q.all([
      ghRepo.getStarredRepos(),
      ghRepo.getWatchedRepos(),
      repoService.getReposForUser(user)
    ])
    .spread(function(starredRepos, watchedRepos, ownedRepos) {
      var suggestions = {};

      function addSuggestion(flag) {
        return function(repo) {
          if(!suggestions[repo.full_name]) {
            suggestions[repo.full_name] = { uri: repo.full_name, repo: repo };
          }
          suggestions[repo.full_name][flag] = true;
        };
      }

      starredRepos.forEach(addSuggestion('is_starred_by_user'));
      watchedRepos.forEach(addSuggestion('is_watched_by_user'));
      ownedRepos.forEach(addSuggestion('is_owned_by_user'));

      HILIGHTED_ROOMS.forEach(function(room) {
        if(!suggestions[room.uri]) {
          suggestions[room.uri] = { uri: room.uri, language: room.language };
        }
        suggestions[room.uri].lang = room.lang;
        suggestions[room.uri].highlighted = true;
      });

      // Find suggestions that a) are not channels but b) don't have repos
      var missingUris = _.values(suggestions).filter(function(item) {
        return !item.channel && !item.repo;
      }).map(function(item) {
        return item.uri;
      });

      return Q.all(missingUris.map(function(uri) {
          return ghRepo.getRepo(uri)
            .then(function(result) {
              if(result) {
                if(suggestions[uri]) {
                  suggestions[uri].repo = result;
                }
              }
            });
        }))
        .thenResolve(suggestions);
    })
    .then(function(suggestions) {
      var uris = Object.keys(suggestions);

      return findReposWithRooms(uris)
        .then(function(rooms) {
          rooms.forEach(function(room) {
            suggestions[room.uri].room = room;
          });

          return _.values(suggestions);
        });

    })
    .then(function(suggestions) {
      return filterSuggestions(suggestions, user);
    })
    .then(function(suggestions) {
      var languageScores = getLanguageScores(suggestions);

      Object.keys(CATEGORIES).forEach(function(name) {
        processCategory(name, suggestions, {
          languageScores: languageScores,
          lang: lang
        });
      });

      suggestions = suggestions.filter(function(item) {
        return item.categories >= 1;
      });

      suggestions.forEach(function(item) {
        item.score = item.score / item.categories;
      });

      suggestions.sort(function(a, b) {
        return b.score - a.score;
      });

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
