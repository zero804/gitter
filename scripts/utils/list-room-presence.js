#!/usr/bin/env node
/*jslint node:true, unused:true */
"use strict";

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var categoriseUsersInRoom = require('../../server/services/categorise-users-in-room');
var roomMembershipService = require('../../server/services/room-membership-service');
var collections = require('../../server/utils/collections');
var Promise = require('bluebird');

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
    help: "uri of room to list presence for"
  })
  .option('fromUser', {
    help: "id of room to list presence for"
  })
  .option('toUser', {
    help: "id of room to list presence for"
  })
  .parse();

function getTroupe() {
  if (opts.uri)
    return troupeService.findByUri(opts.uri);

  if (!opts.fromUser || !opts.toUser) {
    return Promise.reject('Please specify either a uri or a fromUser and toUser');
  }

  return Promise.all([
    userService.findByUsername(opts.fromUser),
    userService.findByUsername(opts.toUser),
  ])
  .spread(function(fromUser, toUser) {
    if (!fromUser) throw new Error('User ' + opts.fromUser + ' not found');
    if (!toUser) throw new Error('User ' + opts.toUser + ' not found');

    return troupeService.findOneToOneTroupe(fromUser._id, toUser._id);
  });

}

getTroupe()
  .then(function(troupe) {
    if (!troupe) throw new Error('No room found');
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
    });
  })
  .catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
