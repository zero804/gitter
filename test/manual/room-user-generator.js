'use strict';

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var Promise = require('bluebird');
var chatService = require('../../server/services/chat-service');
var mongooseUtils = require('../../server/utils/mongoose-utils');
var persistence = require('../../server/services/persistence-service');
var roomService = require('../../server/services/room-service');
var roomMembershipService = require('../../server/services/room-membership-service');
var cumberbatch = require('cumberbatch-name');

var opts = require('yargs')
  .option('room', {
    alias: 'r',
    required: true
  })
  .option('user', {
    alias: 'u',
    required: true
  })
  .option('count', {
    alias: 'c',
    default: 1000
  })
  .help('help')
  .alias('help', 'h')
  .argv;

Promise.all([
    troupeService.findByUri(opts.room),
    userService.findByUsername(opts.user)
  ])
  .spread(function(room, user) {
    var a = [];
    for (var i = 0; i < parseInt(opts.count, 10); i++) {
      var displayName = cumberbatch();
      var username = displayName.replace(/[^A-Za-z]/g,'').toLowerCase() + (i + 1);
      a.push({ username: username, displayName: displayName });
    }

    return Promise.map(a, function(userInfo, i) {
        var newUser = new persistence.User({
          username:           userInfo.username,
          invitedByUser:      user.id,
          invitedToRoom:      room.id,
          displayName:        userInfo.displayName,
          state:              'INVITED'
        });

        return newUser.save()
          .then(function() {
            if (++i % 10 === 0) console.log(i);
            return newUser._id;
          });

      }, { concurrency: 2 })
      .then(function(userIds) {
        return roomMembershipService.addRoomMembers(room._id, userIds);
      });
  })
  .delay(1000)
  .then(function() {
    process.exit();
  })
  .done();
