"use strict";

var env = require('gitter-web-env');
var config = env.config;

var Q = require('q');
var _ = require('lodash');
var shutdown = require('shutdown');

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var roomMembershipService = require('../../server/services/room-membership-service');
var chatService = require('../../server/services/chat-service');

var suggestions = require('gitter-web-suggestions');
var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');

var Intercom = require('intercom-client');
var intercomOptions = {
  appId: config.get("stats:intercom:app_id"),
  appApiKey: config.get("stats:intercom:key")
};

var opts = require("nomnom")
   .option('id', {
      required: false,
      help: 'Mongo user id'
   })
   .option('username', {
      required: false
   })
   .option('email', {
      required: false
   })
   .parse();

if (!opts.id && !opts.username && !opts.email) {
  throw new Error("id, username or email required.");
}

function getUserFromMongo(opts) {
  if (opts.id) {
    return userService.findById(opts.id);
  }
  if (opts.username) {
    return userService.findByUsername(opts.username);
  }
  if (opts.email) {
    return userService.findByEmail(opts.email);
  }
}

function getRoomsForUser(user) {
  return roomMembershipService.findRoomIdsForUser(user.id)
    .then(function(roomIds) {
      // NOTE: we'll only need id, lang and oneToOne in normal operation in
      // order to get the suggestions. The rest is just for debugging.
      return troupeService.findByIdsLean(roomIds, {
        uri: 1,
        lang: 1,
        name: 1,
        userCount: 1,
        oneToOne: 1
      });
    });
}

function getSuggestedRoomsForRooms(rooms) {
  // TODO: replace this with the waterfall method

  // 1to1 rooms aren't included in the graph anyway, so filter them out
  rooms = _.filter(rooms, function(room) {
    return room.oneToOne != true;
  });

  // Cap it, because a user that's in a lot of rooms (like mydigitalself)
  // can really grind neo4j to a halt.
  // (ideally we should have capped the ids before loading the rooms in, but we
  // have to load the rooms in order to filter out oneToOnes first..)
  rooms = rooms.slice(0, 10);

  return suggestions.getSuggestionsForRooms(rooms)
    .then(function(suggestions) {
      console.log(suggestions);
      var roomIds = _.pluck(suggestions, 'roomId');
      return troupeService.findByIdsLean(roomIds, {
        uri: 1,
        name: 1, // for debugging only
        topic: 1, // used as description
        userCount: 1
      });
    })
    .then(function(rooms) {
      // pre-fill the extra values we'll need
      return Q.all(rooms.map(function(room) {
        room.avatarUrl = resolveRoomAvatarUrl(room, 80);
        return chatService.getRoughMessageCount(room.id)
          .then(function(messageCount) {
            room.messageCount = messageCount;
          });
      }))
      .then(function() {
        return rooms;
      });
    });
}

function suggestionsToAttributes(suggestions) {
  suggestions = suggestions.slice(0, 5);
  var attrs = {};
  suggestions.forEach(function(suggestion, index) {
    attrs['suggestion'+index+'_uri'] = suggestion.uri;
    attrs['suggestion'+index+'_avatar'] = suggestion.avatarUrl;
    attrs['suggestion'+index+'_description'] = suggestion.topic;
    attrs['suggestion'+index+'_users'] = suggestion.userCount;
    attrs['suggestion'+index+'_messages'] = suggestion.messageCount;
  });
  return attrs;
}

var user;
var rooms;
getUserFromMongo(opts)
  .then(function(_user) {
    user = _user;
    return getRoomsForUser(user);
  })
  .then(function(_rooms) {
    rooms = _rooms;
    return getSuggestedRoomsForRooms(rooms);
  })
  .then(function(suggestions) {
    //console.log(user);
    // email (and user_id?) should be enough to uniquely identify the user.
    // Create against an existing user acts as an update.
    // All fields that you're not changing remain set as is.
    var profile = {
      email: user.email,
      user_id: user._id,
      custom_attributes: suggestionsToAttributes(suggestions)
    };
    //console.log(profile);
    var client = new Intercom.Client(intercomOptions).usePromises();
    return client.users.create(profile);
  })
  .then(function(intercomUser) {
    console.log(intercomUser);
  })
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    shutdown.shutdownGracefully(1);
  });



