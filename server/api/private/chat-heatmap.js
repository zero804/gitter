"use strict";

var roomService = require('../../services/room-service');
var heatmapService = require('../../services/chat-heatmap-service');
var moment = require('moment');
var debug = require('debug')('gitter:chat-heapmap-route');

module.exports = function(req, res, next) {
  var roomId = req.params.roomId;

  // Expand the date range to sort out timezone issues
  var start = req.query.start ? moment(req.query.start).subtract(1, 'day').toDate() : null;
  var end = req.query.end ? moment(req.query.end).add(1, 'day').toDate() : null;
  var tz = req.query.tz ? req.query.tz : 0;

  // simple auth check, throws on failure
  roomService.findByIdForReadOnlyAccess(req.user, roomId)
    .then(function(room) {
      var roomId = room.id;

      debug('Searching troupeId=%s start=%s end=%s tz=%s', roomId, start, end, tz)

      return heatmapService.getHeatmapForRoom(roomId, start, end, tz);
    })
    .then(function(chatActivity) {
      res.send(chatActivity);
    })
    .catch(next);
};
