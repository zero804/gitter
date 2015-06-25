#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService = require('../../server/services/user-service');
var autoLurkerService = require('../../server/services/auto-lurker-service');
var troupeService = require('../../server/services/troupe-service');
var persistence = require('../../server/services/persistence-service');
var collections = require('../../server/utils/collections');
var Q = require('q');
var shutdown = require('shutdown');
var es = require('event-stream');

// require('../server/utils/event-listeners').installLocalEventListeners();

var opts = require("nomnom")
   .option('room', {
      abbr: 'r',
      help: 'Room URI'
   })
   .option('min', {
      abbr: 'm',
      default: '31',
      help: 'Minimum time in days since last login'
   })
   .option('members', {
      help: 'Minimum number of members in the room'
   })
   .option('dryRun', {
     flag: true,
     help: 'Just show the users who will be affected'
   })
   .parse();

var minTimeInDays = parseInt(opts.min, 10);
var members = parseInt(opts.members, 10);

function run() {
  if (opts.room) return handleSingleRoom();
  if (members) return handleMultipleRooms();
  return Q.reject(new Error('invalid usage'));
}

function handleRoom(troupe) {
  return (opts.dryRun ?
            autoLurkerService.findLurkCandidates(troupe, { minTimeInDays: minTimeInDays }) :
            autoLurkerService.autoLurkInactiveUsers(troupe, { minTimeInDays: minTimeInDays })
            )
    .then(function(candidates) {
      var userIds = candidates.map(function(c) { return c.userId; });
      return [candidates, userService.findByIds(userIds)];
    })
    .spread(function(candidates, users)  {
      var usersHash = collections.indexById(users);

      candidates.forEach(function(c) {
        var user = usersHash[c.userId];
        if (!user) return;

        console.log({
          username: user.username,
          notificationSettings: c.notificationSettings,
          lurk: c.lurk,
          lastAccessTime: c.lastAccessTime && c.lastAccessTime.toISOString()
        });
      });
    });
}

function handleSingleRoom() {
  troupeService.findByUri(opts.room)
    .then(handleRoom);
}

function handleMultipleRooms() {
  var d = Q.defer();

  persistence.Troupe
    .find({ userCount: { $gt: members } })
    .sort({ userCount: -1 })
    .limit(10)
    .stream()
    .pipe(es.through(function(room) {
      this.pause();

      var self = this;
      return handleRoom(room)
        .catch(function(err) {
          self.emit('error', err);
        })
        .finally(function() {
          self.resume();
        })
        .done();
    }))
    .on('end', function() {
      d.resolve();
    })
    .on('error', function(err) {
      d.reject(err);
    });

  return d.promise;
}

run()
  .delay(1000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.error('ERROR IS ', err);
    console.error('ERROR IS ', err.stack);
    shutdown.shutdownGracefully(1);
  });
