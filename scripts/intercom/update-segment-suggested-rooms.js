#!/usr/bin/env node
"use strict";

var env = require('gitter-web-env');
var stats = env.stats;
var config = env.config;
var Promise = require('bluebird');
var _ = require('lodash');
var shutdown = require('shutdown');
var through2Concurrent = require('through2-concurrent');
var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var roomMembershipService = require('../../server/services/room-membership-service');
var suggestionsService = require('../../server/services/suggestions-service');
var userSettingsService = require('../../server/services/user-settings-service');
var restSerializer = require('../../server/serializers/rest-serializer');
var suggestions = require('gitter-web-suggestions');
var intercom = require('gitter-web-intercom');
var getIntercomStream = require('intercom-stream');
var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');


var opts = require('yargs')
  .option('segment', {
    alias: 's',
    description: 'Id of the segment to list'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

if (!opts.segment) {
  // this just makes running the production (or beta) script much easier
  var defaultSegment = config.get('stats:intercom:suggestedRoomSegmentId');
  if (defaultSegment) {
    console.log("Using default segment", defaultSegment);
    opts.segment = defaultSegment;
  } else {
    throw new Error('Segment required.');
  }
}

var stream = getIntercomStream({ client: intercom.client, key: 'users'}, function() {
  return intercom.client.users.listBy({segment_id: opts.segment});
});

function getRoomsForUserId(userId) {
  return roomMembershipService.findRoomIdsForUser(userId)
    .then(function(roomIds) {
      // NOTE: we'll only need id, lang and oneToOne in normal operation in
      // order to get the suggestions. The rest is just for debugging.
      return troupeService.findByIdsLean(roomIds, {
        uri: 1,
        lcOwner: 1,
        lang: 1,
        name: 1,
        userCount: 1,
        oneToOne: 1
      });
    });
}

stream
  .pipe(through2Concurrent.obj({maxConcurrency: 10},
  function(intercomUser, enc, callback) {
    var userId = intercomUser.user_id;
    var username = intercomUser.custom_attributes.username;
    var email = intercomUser.email;
    console.log("Starting "+ username);

    var promises = [
      userService.findById(userId),
      getRoomsForUserId(userId),
      userSettingsService.getUserSettings(userId, 'lang')
    ];
    Promise.all(promises)
      .spread(function(user, rooms, language) {
        return suggestionsService.findSuggestionsForRooms(user, rooms, language);
      })
      .then(function(suggestedRooms) {
        return restSerializer.serialize(suggestedRooms, new restSerializer.SuggestedRoomStrategy());
      })
      .then(function(suggestions) {
        // we use big avatars in the emails
        suggestions.forEach(function(room) {
          room.avatarUrl = resolveRoomAvatarUrl(room, 160);
        });

        var suggestionsString = _.pluck(suggestions, 'uri').join(', ');
        console.log("Suggestions for", username + ':', suggestionsString);

        suggestions.forEach(function(room) {
          stats.event("suggest_room", {
            userId: userId,
            username: username,
            roomId: room._id,
            roomUri: room.uri
          });
        });

        var profile = {
          email: email,
          user_id: userId,
          custom_attributes: intercom.suggestionsToAttributes(suggestions)
        };

        return intercom.client.users.create(profile);
      })
      .then(function(result) {
        console.log('Done with', username);
      })
      //.nodeify(callback);
      .then(function() {
        callback();
      })
      .catch(function(err) {
        console.error(err);
        console.error(err.stack);
        callback(err)
      });
  }))
  .on('data', function(intercomUser) {
  })
  .on('end', function() {
    console.log('done');
    shutdown.shutdownGracefully();
  })
  .on('error', function die(error) {
    console.error(error);
    console.error(error.stack);
    shutdown.shutdownGracefully();
  });
