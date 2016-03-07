#!/usr/bin/env node
/*jslint node:true, unused:true */
'use strict';

var yargs = require('yargs');
var _ = require('lodash');
var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var restSerializer = require('../../server/serializers/rest-serializer');
var legacyRecommendations = require('../../server/services/recommendations/legacy-recommendations');
var shutdown = require('shutdown');
var shimPositionOption = require('../yargs-shim-position-option');

var suggestions  = require('gitter-web-suggestions');


var argv = yargs.argv;
var opts = yargs
  .option('username', shimPositionOption({
    position: 0,
    required: !argv.uri,
    description: 'username to look up e.g trevorah'
  }))
  .option('uri', {
    type: 'array',
    required: !argv.username,
    description: 'room(s) in which to do the lookup'
  })
  .option('max-uri', {
    default: 10,
    description: 'Number of room(s) we limit to when providing multiple room uri in `--uri`',
    defaultDescription: 'This should be limited to 10 for performance with `getSuggestionsForRooms` but we are leaving it flexible in case you need it.'
  })
  .option('language', {
    default: 'en',
    description: 'human language'
  })
  .a.help('help')
  .alias('help', 'h')
  .argv;

if(!opts.username && opts.uri) {
  var maxUri = opts['max-uri'];
  var rooms = [].concat(opts.uri).map(function(uri) {
    return troupeService.findByUri(uri);
  });

  if(rooms.length > maxUri) {
    console.warn('You passed in more than ' + maxUri + ' rooms in. We will only use the first ' + maxUri);
  }

  suggestions.getSuggestionsForRooms(rooms.slice(0, maxUri))
    .then(function(suggestions) {
      var roomIds = _.pluck(suggestions, 'roomId');
      return troupeService.findByIdsLean(roomIds, {
        uri: 1,
        lcOwner: 1,
        userCount: 1
      });
    })
    .then(function(suggestedRooms) {
      suggestedRooms.forEach(function(suggestedRoom) {
        console.log(suggestedRoom.uri, suggestedRoom);
      });
    });
}
else {
  userService.findByUsername(opts.username)
    .then(function(user) {
      var uri = opts.uri[0];
      return [user, uri && troupeService.findByUri(uri)];
    })
    .spread(function(user, room) {
      if (room) {
        return suggestions.getSuggestionsForRoom(room, user, opts.language);
      }

      return legacyRecommendations.getSuggestionsForUser(user, opts.language);
      // return suggestions.getSuggestionsForUser(user, opts.language);
    })
    .then(function(suggestions) {
      return restSerializer.serialize(suggestions, new restSerializer.SuggestedRoomStrategy({ }));
    })
    .then(function(repos) {
      repos.forEach(function(suggestion) {
        console.log(suggestion.uri, suggestion);
      });
    })
    .delay(1000)
    .catch(function(err) {
      console.error(err.stack);
    })
    .finally(function() {
      shutdown.shutdownGracefully();
    });
}
