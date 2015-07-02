/* jshint node:true, unused:true */
'use strict';

var persistence = require('../../server/services/persistence-service');
var es = require('event-stream');
var csv = require('fast-csv');

module.exports = function roomStream() {
  return persistence.Troupe
    .find({ oneToOne: { $ne: true }})
    .lean()
    .select('oneToOne githubType security uri userCount')
    .stream()
    .pipe(es.map(function (room, callback) {
      callback(null, {
        roomId: '' + room._id,
        security: room.security
      });
    }))
    .pipe(csv.createWriteStream({ headers: true }));
};
