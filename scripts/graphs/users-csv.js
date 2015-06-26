/* jshint node:true, unused:true */
'use strict';

var persistence = require('../../server/services/persistence-service');
var shutdown = require('shutdown');
var es = require('event-stream');
var csv = require('fast-csv');
var fs = require('fs');

persistence.User
  .find({ })
  .lean()
  .select('username')
  .stream()
  .pipe(es.map(function (user, callback) {
    callback(null, {
      userId: '' + user._id
    });
  }))
  .on('end', function() {
    setTimeout(function() {
      shutdown.shutdownGracefully();
    }, 10000);
  })
  .pipe(csv.createWriteStream({ headers: true }))
  .pipe(fs.createWriteStream("users.csv"));
