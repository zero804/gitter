#!/usr/bin/env node
"use strict";

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var roomMembershipService = require('../../server/services/room-membership-service');
var suggestions = require('gitter-web-suggestions');
var shutdown = require('shutdown');
var _ = require('lodash')

var opts = require("nomnom")
  .option('uri', {
    help: "uri of room to list suggestions for"
  })
  .option('username', {
    help: "username of user list suggestions for"
  })
  .parse();


function getRooms() {
  var lang = opts.lang || 'en';
  if (opts.uri) {
    return troupeService.findByUri(opts.uri)
      .then(function(room) {
        return [room];
      });
  } else if (opts.username) {
    return userService.findByUsername(opts.username)
      .then(function(user) {
        return roomMembershipService.findRoomIdsForUser(user.id);
      })
      .then(function(roomIds) {
        // cap it just in case
        // roomIds = roomIds.slice(0, 10);

        // NOTE: we'll only need id and lang in normal operation
        return troupeService.findByIdsLean(roomIds, {
          uri: 1,
          lang: 1,
          name: 1,
          userCount: 1
        });
      });
  } else {
    throw new Error('uri or username required');
  }
}

function mostPopularItem(strings) {
  if (strings.length == 0) return undefined;
  return _(strings).countBy().toPairs().max(_.last).head().value();
}

function pickLanguageFromRooms(rooms) {
  // languages that aren't null or undefined
  // NOTE: only public rooms will have their languages filled in, at least
  // eventually.
  var languages = _(rooms).pluck('lang').filter().value();

  // try the most popular non-english one
  // (or is it better to go with just the most popular one?)
  var nonEnglish = _.filter(languages, function(lang) { return lang != 'en'; });
  var mostPopular;
  if (nonEnglish) {
    mostPopular = mostPopularItem(nonEnglish);
    if (mostPopular) {
      return mostPopular;
    }
  }

  // then fall back to english
  return 'en';
}

getRooms()
  .then(function(roomsIncluding1to1s) {
    // 1to1 rooms aren't included in the graph anyway
    var rooms = _.filter(roomsIncluding1to1s, function(room) {
      return room.oneToOne != true;
    });

    // smallest first
    rooms.sort(function(a, b) {
      return a.userCount - b.userCount;
    });

    console.log("input", rooms);
    var lang = pickLanguageFromRooms(rooms);
    console.log("lang", lang)
    return suggestions.getSuggestionsForRooms(rooms, lang);
  })
  .then(function(suggestions) {
    var roomIds = _.pluck(suggestions, 'roomId');
    return troupeService.findByIdsLean(roomIds, {uri: 1, name: 1});
  })
  .then(function(suggestedRooms) {
    console.log("suggestedRooms", _.pluck(suggestedRooms, 'uri'));
  })
  .catch(function(err) {
    console.error(err.stack);
    throw err;
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
