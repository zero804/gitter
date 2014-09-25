#!/usr/bin/env node
/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var collections = require('../../server/utils/collections');
var persistenceService = require('../../server/services/persistence-service');
var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var emailNotificationService = require('../../server/services/email-notification-service');
var Q = require('Q');

var logger = require('../../server/utils/env').logger;

// if something goes terribly wrong use this
function die(err) {
  logger.error('Catastrophic error: ' + err,  { exception: err });
  process.exit(1);
}

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

function markAsReminded(user) {
  user.inviteReminderSent = new Date();
  return user.saveQ().catch(die);
}

// run the script
persistenceService.User
  .findQ({ state: 'INVITED', inviteReminderSent: { $exists: false }, invitedByUser: { $exists: true }, invitedToRoom: { $exists: true } })
  .then(mapInviteesAndRooms)
  .spread(populate)
  .spread(index)
  .spread(function (users, invitees, rooms) {
    console.log('attempting to sent reminder to', users, 'user(s)');
    return Q.all(users.map(function (user) {
      var fromUser = invitees[user.invitedByUser];
      var room = rooms[user.invitedToRoom];
      return emailNotificationService.sendInvitation(fromUser, user, room, true)
        .then(markAsReminded.bind(null, user))
        .catch(function () {
          logger.error('Couldn\'t notify user:', user.displayName, 'id ->', user._id);
        });
    }));
  })
  .then(function (users) {
    console.log('invitation reminder sent to', users.length, 'user(s)');
    console.log('exiting...:');
    process.exit();
  })
  .catch(function (err) {
    logger.error(err);
  });
