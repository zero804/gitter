/* jshint node:true, unused:true */
'use strict';

var persistence = require('../../server/services/persistence-service');
var shutdown = require('shutdown');
var es = require('event-stream');
var csv = require('fast-csv');
var fs = require('fs');

persistence.Troupe
  .find({ oneToOne: { $ne: true }, security: 'PUBLIC' })
  .lean()
  .select('users.userId')
  .slaveOk()
  .stream()
  .pipe(es.through(function (room) {
    room.users.forEach(function(roomUser) {
      this.emit('data', { roomId: '' + room._id, userId: '' + roomUser.userId });
    }, this);
  }))
  .on('end', function() {
    setTimeout(function() {
      shutdown.shutdownGracefully();
    }, 10000);
  })
  .pipe(csv.createWriteStream({ headers: true }))
  .pipe(fs.createWriteStream("membership.csv"));
