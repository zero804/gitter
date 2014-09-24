#!/usr/bin/env node
/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var collections = require('../../server/utils/collections');
var persistenceService = require('../../server/services/persistence-service');
var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var emailNotificationService = require('../../server/services/email-notification-service');
var Q = require('Q');

// gets a list of invitees and room ids, returns an array containing: [ users (Array), invitees (Array), rooms (Array)].
function mapInviteesAndRooms(users) {
  var invitees = [];
  var rooms = [];

  users.forEach(function (user) {
    invitees.push(user.invitedByUser);
    rooms.push(user.invitedToRoom);
  });

  return [users, invitees, rooms];
}

// fetches the invitees and rooms from database
function populate(users, invitees, rooms) {
  return Q.all([
    users,
    userService.findByIds(invitees),
    troupeService.findByIds(rooms)
  ]);
}

// fetches the invitees and rooms from database
function index(users, invitees, rooms) {
  return Q.all([
    users,
    collections.indexById(invitees),
    collections.indexById(rooms)
  ]);
}

// run the script
persistenceService.User
  .findQ({ state: 'INVITED', inviteReminderSent: { $exists: false }, invitedByUser: { $exists: true }, invitedToRoom: { $exists: true } })
  .then(mapInviteesAndRooms)
  .spread(populate)
  .spread(index)
  .spread(function (users, invitees, rooms) {
    return Q.all(users.map(function (user) {
      var fromUser = invitees[user.invitedByUser];
      var toUser = user;
      var room = rooms[user.invitedToRoom];
      return emailNotificationService.sendInvitation(fromUser, toUser, room, true)
        .then(function () {
          user.inviteReminderSent = new Date();
          return users;
          // return persistenceService.User.saveQ(user);
        });
    }));
  })
  .then(function (users) {
    console.log('users.length:', users.length);
    process.exit();
  })
  .catch(function (err) {
    console.log('catch() ====================');
    console.log(err);
  });
