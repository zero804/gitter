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
  .select('oneToOne githubType security uri userCount')
  .stream()
  .pipe(es.map(function (room, callback) {
    callback(null, {
      roomId: '' + room._id
    });
  }))
  .on('end', function() {
    setTimeout(function() {
      shutdown.shutdownGracefully();
    }, 10000);
  })
  .pipe(csv.createWriteStream({ headers: true }))
  .pipe(fs.createWriteStream("rooms.csv"));
