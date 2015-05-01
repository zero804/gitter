/* jshint node:true */
"use strict";

var shutdown = require('shutdown');
var troupeService = require('../../server/services/troupe-service');
var roomService = require('../../server/services/room-service');
var userService = require('../../server/services/user-service');
var Q = require('q');

var winston = require('../../server/utils/winston');

require('../../server/utils/event-listeners').installLocalEventListeners();

var opts = require("nomnom")
   .option('old', {
      abbr: 'o',
      required: true,
      help: 'Old uri for the room'
   })
   .option('new', {
      abbr: 'n',
      required: true,
      help: 'New uri for the room'
   })
   .option('user', {
      abbr: 'u',
      required: true,
      help: 'User to perform the rename on behalf of'
   })
   .parse();


userService.findByUsername(opts.user)
  .then(function(user) {
    if (!user) throw new Error('Unable to find user ' + opts.username);

    return roomService.renameUri(opts.old, opts.new, user);
  })
  .delay(5000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .done();
