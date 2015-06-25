#!/usr/bin/env node

/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('../server/services/persistence-service');
var userService = require('../server/services/user-service');
var autoLurkerService = require('../server/services/auto-lurker-service');
var troupeService = require('../server/services/troupe-service');
var collections = require('../server/utils/collections');
var shutdown = require('shutdown');

// require('../server/utils/event-listeners').installLocalEventListeners();

var opts = require("nomnom")
   .option('room', {
      abbr: 'r',
      required: true,
      help: 'Room URI'
   })
   .option('min', {
      abbr: 'm',
      default: '31',
      help: 'Minimum time in days since last login'
   })
   .option('dryRun', {
     flag: true,
     help: 'Just show the users who will be affected'
   })
   .parse();

var minTimeInDays = parseInt(opts.min, 10);


troupeService.findByUri(opts.room)
  .then(function(troupe) {
    if (opts.dryRun) {
      return autoLurkerService.findLurkCandidates(troupe, { minTimeInDays: minTimeInDays })
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
    } else {
      return autoLurkerService.autoLurkInactiveUsers(troupe, { minTimeInDays: minTimeInDays });
    }
  })
  .delay(1000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .catch(function(err) {
    console.log('ERROR IS ', err);
    shutdown.shutdownGracefully(1);
  });
