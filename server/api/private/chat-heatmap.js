/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var roomService = require('../../services/room-service');
var chatService = require('../../services/chat-service');
var moment = require('moment');

module.exports = function(req, res, next) {
  var roomId = req.params.roomId;

  var endMoment = req.query.end ? moment(req.query.end) : moment.utc().endOf('day');
  var startMoment = req.query.start ? moment(req.query.start) : moment(endDate).subtract(1, 'years').startOf('day');

  var endDate = endMoment.toDate();
  var startDate = startMoment.toDate();

  // simple auth check, throws on failure
  roomService.findByIdForReadOnlyAccess(req.user, roomId)
    .then(function(room) {
      var roomId = room.id;

      return chatService.findDailyChatActivityForRoom(roomId, startDate, endDate);
    })
    .then(function(chatActivity) {
      res.send(chatActivity);
    })
    .fail(next);
};
