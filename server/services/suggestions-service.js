'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var collections = require('../utils/collections');
var promiseUtils = require('../utils/promise-utils');
var mongooseUtils = require('../utils/mongoose-utils');
var troupeService = require('./troupe-service');
var roomMembershipService = require('./room-membership-service');
var userService = require('./user-service');
var userSettingsService = require('./user-settings-service');
var graphSuggestions = require('gitter-web-suggestions');
var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');
var cacheWrapper = require('gitter-web-cache-wrapper');
var debug = require('debug')('gitter:suggestions');

var NUM_SUGGESTIONS = 10;
var MAX_SUGGESTIONS_PER_ORG = 2;
var HIGHLIGHTED_ROOMS = [
  {
    uri: 'gitterHQ/gitter',
    localeLanguage: 'en',
  }, {
    uri: 'gitterHQ/developers',
    localeLanguage: 'en',
  }, {
    uri: 'marionettejs/backbone.marionette',
    localeLanguage: 'en',
  },{
    uri: 'LaravelRUS/chat',
    localeLanguage: 'ru',
  }, {
    uri: 'gitterHQ/nodejs',
    localeLanguage: 'en',
  },{
    uri: 'rom-rb/chat',
    localeLanguage: 'en',
  }, {
    uri: 'webpack/webpack',
    localeLanguage: 'en',
  }, {
    uri: 'ruby-vietnam/chat',
    localeLanguage: 'vi',
  }, {
    uri: 'angular-ui/ng-grid',
    localeLanguage: 'en',
  }
];


var starredRepoRooms = Promise.method(function(user, existingRooms, localeLanguage) {
  // TODO
  return [];
});

function graphRooms(options) {
  var existingRooms = options.rooms;
  var language = options.language;

  // limit how many we send to neo4j
  var firstTen = existingRooms.slice(0, 10);
  return graphSuggestions.getSuggestionsForRooms(firstTen, language)
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
      return suggestedRooms;
    });
}

function siblingRooms(options) {
  var existingRooms = options.rooms;

  var orgNames = _.uniq(_.pluck(existingRooms, 'lcOwner'));
  return Promise.all(_.map(orgNames, function(orgName) {
      // TODO: include private/inherited rooms for orgs you're in. Requires
      // render.js to be refactored a bit so we can reuse the same logic.
      // We should also probably limit the number of results and also the
      // fields that get returned.
      return troupeService.findChildRoomsForOrg(orgName, {security: 'PUBLIC'});
    }))
    .then(function(arrays) {
      var suggestedRooms = Array.prototype.concat.apply([], arrays);
      return suggestedRooms;
    });
}

function hilightedRooms(options) {
  var language = options.language;

  // TODO: maybe we should pick some random rooms that are tagged by staff to
  // be featured here rather than the hardcoded hilighted list?
  var filtered = _.filter(HIGHLIGHTED_ROOMS, function(roomInfo) {
    var roomLang = roomInfo.localeLanguage;
    return (roomLang == 'en' || roomLang == language);
  });
  return Promise.all(_.map(filtered, function(roomInfo) {
    return troupeService.findByUri(roomInfo.uri);
  }));
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
    return filterRooms(results, existingRooms);
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

