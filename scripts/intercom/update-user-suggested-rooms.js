"use strict";

var env = require('gitter-web-env');
var config = env.config;

var Q = require('q');
var _ = require('lodash');
var shutdown = require('shutdown');

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var roomMembershipService = require('../../server/services/room-membership-service');
var suggestionsService = require('../../server/services/suggestions-service');

var suggestions = require('gitter-web-suggestions');

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
        lcOwner: 1,
        lang: 1,
        name: 1,
        userCount: 1,
        oneToOne: 1
      });
    });
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
    return suggestionsService.findSuggestionsForRooms(rooms);
  })
  .then(function(suggestions) {
    //console.log(user);
    // email (and user_id?) should be enough to uniquely identify the user.
    // Create against an existing user acts as an update.
    // All fields that you're not changing remain set as is.
    console.log(_.pluck(suggestions, 'uri'));
    var profile = {
      email: user.email,
      user_id: user._id,
      custom_attributes: suggestionsService.suggestionsToAttributes(suggestions)
    };
    //console.log(profile);
    var client = new Intercom.Client(intercomOptions).usePromises();
    return client.users.create(profile);
  })
  .then(function(intercomUser) {
    console.log(intercomUser.body);
  })
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error(err);
    console.error(err.stack);
    shutdown.shutdownGracefully(1);
  });



