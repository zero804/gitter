#!/usr/bin/env node
/*jslint node:true, unused:true */
"use strict";

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var categoriseUsersInRoom = require('../../server/services/categorise-users-in-room');
var roomMembershipService = require('../../server/services/room-membership-service');
var collections = require('../../server/utils/collections');

var shutdown = require('shutdown');

function pad(string, length) {
  if (!string) string = '';
  
  while(string.length < length) {
    string = string + ' ';
  }
  return string;
}
var opts = require("nomnom")
  .option('uri', {
    position: 0,
    required: true,
    help: "uri of room to list presence for"
  })
  .parse();

troupeService.findByUri(opts.uri)
  .then(function(troupe) {
    return [troupe, roomMembershipService.findMembersForRoom(troupe._id)];
  })
  .spread(function(troupe, userIds) {
    return categoriseUsersInRoom(troupe._id, userIds);
  })
  .then(function(result) {
    return [result, userService.findByIdsLean(Object.keys(result), { username: 1 })];
  })
  .spread(function(result, users) {
    var usersHash = collections.indexById(users);
    Object.keys(result).forEach(function(userId) {
      var user = usersHash[userId];
      console.log(pad(user && user.username, 30), ' ', result[userId]);
    })
  })
  .catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
