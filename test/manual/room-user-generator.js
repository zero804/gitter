#!/usr/bin/env node
'use strict';

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var Q = require('q');
var qlimit = require('qlimit');
var chatService = require('../../server/services/chat-service');
var mongooseUtils = require('../../server/utils/mongoose-utils');
var persistence = require('../../server/services/persistence-service');
var roomService = require('../../server/services/room-service');
var cumberbatch = require('cumberbatch-name');

var opts = require("nomnom")
.option('room', {
  abbr: 'r',
  required: true
})
.option('user', {
  abbr: 'u',
  required: true
})
.option('count', {
  abbr: 'c',
  default: 1000
})
.parse();

var limit = qlimit(2);
Q.all([
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

    return Q.all(a.map(limit(function(userInfo, i) {

        var newUser = new persistence.User({
          username:           userInfo.username,
          invitedByUser:      user.id,
          invitedToRoom:      room.id,
          displayName:        userInfo.displayName,
          state:              'INVITED'
        });

        return newUser.saveQ()
          .then(function() {
            room.addUserById(newUser.id);
          })
          .then(function() {
            if (++i % 10 === 0) console.log(i);
          });

      }))).
      then(function() {
        return room.saveQ();
      });
  })
  .delay(1000)
  .then(function() {
    process.exit();
  })
  .done();
