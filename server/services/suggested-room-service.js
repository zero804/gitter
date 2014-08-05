/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var repoService     = require('./repo-service');
var GithubRepo      = require("./github/github-repo-service");
var persistence     = require("./persistence-service");
var Q               = require('q');
var _               = require('underscore');

var HILIGHTED_ROOMS = [{
  uri: 'gitterHQ/gitter',
  localeLanguage: 'en'
}, {
  uri: 'marionettejs/backbone.marionette',
  language: 'JavaScript',
  localeLanguage: 'en'
},{
  uri: 'LaravelRUS/chat',
  channel: true,
  language: 'PHP',
  localeLanguage: 'ru'
}, {
  uri: 'gitterHQ/nodejs',
  chanel: true,
  language: 'JavaScript',
  localeLanguage: 'en'
}, {
  uri: 'lotus/chat',
  chanel: true,
  language: 'Ruby',
  localeLanguage: 'en'
},{
  uri: 'rom-rb/chat',
  chanel: true,
  language: 'Ruby',
  localeLanguage: 'en'
}, {
  uri: 'webpack/webpack',
  language: 'JavaScript',
  localeLanguage: 'en'
}, {
  uri: 'ruby-vietnam/chat',
  chanel: true,
  language: 'Ruby',
  localeLanguage: 'vi'
}, {
  uri: 'require-lx/group',
  language: 'JavaScript',
  localeLanguage: 'en'
}, {
  uri: 'angular-ui/ng-grid',
  language: 'JavaScript',
  localeLanguage: 'en'
}, {
  uri: 'opscode/supermarket',
  language: 'Ruby',
  localeLanguage: 'en'
}, {
  uri: 'MahApps/MahApps.Metro',
  language: 'PowerShell',
  localeLanguage: 'en'
}, {
  uri: 'sympy/sympy',
  language: 'Python',
  localeLanguage: 'en'
}, {
  uri: 'rogeriopvl/erebot',
  language: 'JavaScript',
  localeLanguage: 'es'
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
    return context.preferredComputerLanguages[language] || 0;
  },
  userLanguage: function(item, context) {
    if(!context.localeLanguage || !item.localeLanguage) return;
    return item.localeLanguage === context.localeLanguage ? 1 : 0;
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
function findRooms(uriList) {
  if(uriList.length === 0) return Q.resolve([]);

  var uris = uriList.map(function(r) {
    return r && r.toLowerCase();
  });

  return persistence.Troupe.findQ({
      lcUri: { $in: uris }
    }, { uri: 1, users: 1 });
}

function removeUselessSuggestions(suggestions, user) {
  return suggestions.filter(function(suggestion) {
    if(suggestion.room) {
      // it's not a good room suggestion if the user is already in the room
      return !suggestion.room.containsUserId(user.id);
    } else if(suggestion.repo) {
      // if no room exists but a repo exists, then the user must be the repo admin to create that repo room
      return suggestion.repo.permissions && suggestion.repo.permissions.admin;
    } else {
      // if no room exists and the user cannot create it, then its an impossible suggestion
      return false;
    }
  });
}

function getPreferredComputerLanguages(suggestions) {
  var result = {};
  suggestions.forEach(function(item) {
    var repo = item.repo;
    if(!repo || !repo.language) return;
    result[repo.language] = result[repo.language] ? result[repo.language] + 1 : 1;
  });

  return result;
}

function getSuggestedRepoMap(user) {
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

      return suggestions;
    });
}

function addHighlightedRooms(suggestionMap) {
  HILIGHTED_ROOMS.forEach(function(room) {
    if(!suggestionMap[room.uri]) {
      suggestionMap[room.uri] = { uri: room.uri, language: room.language };
    }
    suggestionMap[room.uri].localeLanguage = room.localeLanguage;
    suggestionMap[room.uri].highlighted = true;
  });

  return suggestionMap;
}

function addMissingGithubData(suggestionMap, user) {
  var ghRepo = new GithubRepo(user);

  // Find suggestions that a) are not channels but b) don't have repos
  var missingUris = _.values(suggestionMap).filter(function(item) {
    return !item.channel && !item.repo;
  }).map(function(item) {
    return item.uri;
  });

  return Q.all(missingUris.map(function(uri) {
      return ghRepo.getRepo(uri)
        .then(function(result) {
          if(result) {
            if(suggestionMap[uri]) {
              suggestionMap[uri].repo = result;
            }
          }
        });
    }))
    .thenResolve(suggestionMap);
}

function addMissingGitterData(suggestionMap) {
  var uris = Object.keys(suggestionMap);

  return findRooms(uris)
    .then(function(rooms) {
      rooms.forEach(function(room) {
        suggestionMap[room.uri].room = room;
      });
    })
    .thenResolve(suggestionMap);
}


function getSuggestions(user, localeLanguage) {

  return getSuggestedRepoMap(user)
    .then(function(suggestionMap) {
      suggestionMap = addHighlightedRooms(suggestionMap);

      return addMissingGithubData(suggestionMap, user);
    })
    .then(function(suggestionMap) {
      return addMissingGitterData(suggestionMap);
    })
    .then(function(suggestionMap) {
      var suggestions = _.values(suggestionMap);
      return removeUselessSuggestions(suggestions, user);
    })
    .then(function(suggestions) {
      var preferredComputerLanguages = getPreferredComputerLanguages(suggestions);

      Object.keys(CATEGORIES).forEach(function(name) {
        processCategory(name, suggestions, {
          preferredComputerLanguages: preferredComputerLanguages,
          localeLanguage: localeLanguage
        });
      });

      suggestions.forEach(function(item) {
        if(item.categories) {
          item.score = item.score / item.categories;
        } else {
          item.score = 0;
        }
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
