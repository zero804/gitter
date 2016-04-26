'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var collections = require('../utils/collections');
var promiseUtils = require('../utils/promise-utils');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var troupeService = require('./troupe-service');
var roomMembershipService = require('./room-membership-service');
var userService = require('./user-service');
var userSettingsService = require('./user-settings-service');
var userScopes = require('../utils/models/user-scopes');
var graphSuggestions = require('gitter-web-suggestions');
var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');
var cacheWrapper = require('gitter-web-cache-wrapper');
var debug = require('debug')('gitter:suggestions');
var logger = require('gitter-web-env').logger;


// the old github recommenders that find repos, to be filtered to rooms
var ownedRepos = require('./recommendations/owned-repos');
var starredRepos = require('./recommendations/starred-repos');
var watchedRepos = require('./recommendations/watched-repos');

var NUM_SUGGESTIONS = 12;
var MAX_SUGGESTIONS_PER_ORG = 2;
var HIGHLIGHTED_ROOMS = [
  {
    uri: 'gitterHQ/gitter',
    localeLanguage: 'en',
  }, {
    uri: 'gitterHQ/developers',
    localeLanguage: 'en',
  },{
    uri: 'LaravelRUS/chat',
    localeLanguage: 'ru',
  }, {
    uri: 'google/material-design-lite',
    localeLanguage: 'en'
  }, {
    uri: 'pydata/pandas',
    localeLanguage: 'en'
  }, {
    uri: 'PerfectlySoft/Perfect',
    localeLanguage: 'en'
  }, {
    uri: 'twbs/bootstrap',
    localeLanguage: 'en'
  }, {
    uri: 'scala-js/scala-js',
    localeLanguage: 'en'
  }, {
    uri: 'gitterHQ/nodejs',
    localeLanguage: 'en',
  },{
    uri: 'FreeCodeCamp/FreeCodeCamp',
    localeLanguage: 'en',
  }, {
    uri: 'webpack/webpack',
    localeLanguage: 'en',
  }, {
    uri: 'angular-ui/ng-grid',
    localeLanguage: 'en',
  }
];

function reposToRooms(repos) {
  // Limit to a sane number that's a bit higher than the number we'll use
  // because we're still going to be filtering out the ones the user is already
  // in later.
  repos = repos.slice(0, 100);

  debug("start reposToRooms");
  return Promise.all(_.map(repos, function(repo) {
      return troupeService.findByUri(repo.uri);
    }))
    .then(function(rooms) {
      debug("end reposToRooms");

      // strip nulls
      return _.filter(rooms);
    });
}

var ownedRepoRooms = Promise.method(function(options) {
  var user = options.user;
  if (!user || !userScopes.isGitHubUser(user)) {
    return [];
  }

  debug('checking ownedRepoRooms');

  return ownedRepos(user)
    .then(reposToRooms)
    .then(function(rooms) {
      if (debug.enabled) {
        debug("ownedRepoRooms", _.pluck(rooms, "uri"));
      }
      return rooms;
    });
});

var starredRepoRooms = Promise.method(function(options) {
  var user = options.user;
  if (!user || !userScopes.isGitHubUser(user)) {
    return [];
  }

  debug('checking starredRepoRooms');

  return starredRepos(user)
    .then(reposToRooms)
    .then(function(rooms) {
      if (debug.enabled) {
        debug("starredRepoRooms", _.pluck(rooms, "uri"));
      }
      return rooms;
    });
});

var watchedRepoRooms = Promise.method(function(options) {
  var user = options.user;
  if (!user || !userScopes.isGitHubUser(user)) {
    return [];
  }

  debug('checking watchedRepoRooms');

  return watchedRepos(user)
    .then(reposToRooms)
    .then(function(rooms) {
      if (debug.enabled) {
        debug("watchedRepoRooms", _.pluck(rooms, "uri"));
      }
      return rooms;
    });
});

var graphRooms = Promise.method(function(options) {
  var existingRooms = options.rooms;

  if (!existingRooms || !existingRooms.length) {
    return [];
  }

  debug('checking graphRooms');

  var language = options.language;

  // limit how many we send to neo4j
  var firstTen = existingRooms.slice(0, 10);
  return graphSuggestions.getSuggestionsForRooms(firstTen, language)
    .timeout(2000)
    .then(function(suggestions) {
      var roomIds = _.pluck(suggestions, 'roomId');
      return troupeService.findByIdsLean(roomIds);
    })
    .then(function(suggestedRooms) {
      // Make sure there are no more than MAX_SUGGESTIONS_PER_ORG per
      // organisation coming out of the graph.
      // (The siblingRooms step might just add them back in anyway which is why
      //  this is not a standard step in filterRooms())
      var orgTotals = {};
      _.remove(suggestedRooms, function(room) {
        if (orgTotals[room.lcOwner] === undefined) {
          orgTotals[room.lcOwner] = 0;
        }
        orgTotals[room.lcOwner] += 1;
        return (orgTotals[room.lcOwner] > MAX_SUGGESTIONS_PER_ORG);
      });

      if (debug.enabled) {
        debug("graphRooms", _.pluck(suggestedRooms, "uri"));
      }

      return suggestedRooms;
    })
    .catch(function(err) {
      logger.error("Neo4J error: " + err, {
        exception: err
      });
      return [];
    });
});

var siblingRooms = Promise.method(function(options) {
  var existingRooms = options.rooms;

  if (!existingRooms || !existingRooms.length) {
    return [];
  }

  debug('checking siblingRooms');

  var orgNames = _.uniq(_.pluck(existingRooms, 'lcOwner'));
  return Promise.all(_.map(orgNames, function(orgName) {
      return troupeService.findChildRoomsForOrg(orgName, {security: 'PUBLIC'});
    }))
    .then(function(arrays) {
      var suggestedRooms = Array.prototype.concat.apply([], arrays);

      if (debug.enabled) {
        debug("siblingRooms", _.pluck(suggestedRooms, "uri"));
      }

      return suggestedRooms;
    });
});

function hilightedRooms(options) {
  var language = options.language;

  // shuffle so we don't always present the same ones first
  var shuffled = _.shuffle(HIGHLIGHTED_ROOMS);

  var filtered = _.filter(shuffled, function(roomInfo) {
    var roomLang = roomInfo.localeLanguage;
    return (roomLang == 'en' || roomLang == language);
  });

  return Promise.all(_.map(filtered, function(roomInfo) {
      return troupeService.findByUri(roomInfo.uri);
    }))
    .then(function(suggestedRooms) {
      if (suggestedRooms.length) {
        if (debug.enabled) {
          debug("hilightedRooms", _.pluck(suggestedRooms, "uri"));
        }
      }

      return suggestedRooms;
    });
}

function filterRooms(suggested, existing) {
  // not necessarily sure where suggested comes from, so make sure id is filled
  // in and a string so we can safely use that as a key in a map.
  mongooseUtils.addIdToLeanArray(suggested);

  // remove all the nulls/undefineds from things that didn't exist
  var filtered = _.filter(suggested);

  // filter out the existing rooms
  var existingMap = _.indexBy(existing, 'id');
  filtered = _.filter(filtered, function(room) {
    // make very sure we only find public rooms
    if (room.security != 'PUBLIC') {
      return false;
    }
    return existingMap[room.id] === undefined;
  })

  // filter out duplicates
  var roomMap = {};
  filtered = _.filter(filtered, function(room) {
    if (roomMap[room.id]) {
      return false;
    } else {
      roomMap[room.id] = true;
      return true;
    }
  });

  return filtered;
}

var recommenders = [
  // Disabling these for now because they both just tend to find "my-org/*" and
  // we have other places to suggest those already and you certainly have other
  // ways of discovering or being told about your orgs' own rooms so I feel
  // doubtful about the potential network effect here.
  //ownedRepoRooms,
  //watchedRepoRooms,

  starredRepoRooms,
  graphRooms,
  siblingRooms,
  hilightedRooms
];

/*

options can have the following and they are all optional
* user
* rooms (array)
* language (defaults to 'en')

The plugins can just skip themselves if options doesn't contain what they need.

*/
function findSuggestionsForRooms(options) {
  var existingRooms = options.rooms || [];
  var language = options.language || 'en';

  // copy the defaults back in so all the plugins get the defaults
  options.rooms = existingRooms;
  options.language = language;

  // 1to1 rooms aren't included in the graph anyway, so filter them out first
  existingRooms = _.filter(existingRooms, function(room) {
    return room.oneToOne !== true;
  });

  var filterSuggestions = function(results) {
    var filtered = filterRooms(results, existingRooms);
    // Add all the rooms we've found so far to the rooms used by subsequent
    // lookups. This means that a new github user that hasn't joined any rooms
    // yet but has starred some GitHub rooms can get graph results whereas
    // otherwise graphRooms would be skipped because it wouldn't have any rooms
    // to use as input. This should also benefit siblingRooms because it will
    // find siblings of suggested rooms (if it gets there) which is probably
    // better than just serving hilighted rooms.
    options.rooms = existingRooms.concat(filtered);
    return filtered;
  };
  return promiseUtils.waterfall(recommenders, [options], filterSuggestions, NUM_SUGGESTIONS);
}
exports.findSuggestionsForRooms = findSuggestionsForRooms;

function findRoomsByUserId(userId) {
  return roomMembershipService.findRoomIdsForUser(userId)
    .then(function(roomIds) {
      return troupeService.findByIdsLean(roomIds, {
        uri: 1,
        lcOwner: 1,
        lang: 1,
        oneToOne: 1
      });
    });
}

// cache by userId
exports.findSuggestionsForUserId = cacheWrapper('findSuggestionsForUserId',
  function(userId) {
    return Promise.all([
      userService.findById(userId),
      findRoomsByUserId(userId),
      userSettingsService.getUserSettings(userId, 'lang')
    ])
    .spread(function(user, existingRooms, language) {
      return findSuggestionsForRooms({
        user: user,
        rooms: existingRooms,
        language: language
      });
    })
  });
