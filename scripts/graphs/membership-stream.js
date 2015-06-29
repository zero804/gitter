/* jshint node:true, unused:true */
'use strict';

var persistence = require('../../server/services/persistence-service');
var es = require('event-stream');
var csv = require('fast-csv');

module.exports = function() {
  return persistence.Troupe
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
    .pipe(csv.createWriteStream({ headers: true }));
};
