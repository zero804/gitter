/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var roomService = require('../../services/room-service');

module.exports = function(req, res, next) {
  var roomId = req.params.roomId;

  roomService.findByIdForReadOnlyAccess(req.user, roomId)
    .then(function(room) {

    })
    .fail(next);
};