/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var roomService = require('../../services/room-service');
var heatmapService = require('../../services/chat-heatmap-service');
var moment = require('moment');

module.exports = function(req, res, next) {
  var roomId = req.params.roomId;

  var start = req.query.start ? moment(req.query.start).toDate() : null;
  var end = req.query.end ? moment(req.query.end).toDate() : null;

  // simple auth check, throws on failure
  roomService.findByIdForReadOnlyAccess(req.user, roomId)
    .then(function(room) {
      var roomId = room.id;

      return heatmapService.getHeatmapForRoom(roomId, start, end);
    })
    .then(function(chatActivity) {
      res.send(chatActivity);
    })
    .catch(next);
};
