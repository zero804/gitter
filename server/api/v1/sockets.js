/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var presenceService = require('../../services/presence-service');

module.exports = function(req, res, next) {
  var socketId = String(req.params.socketId);
  var userId = req.user && req.user.id;

  presenceService.socketDisconnectionRequested(userId, socketId, function(err) {
    if(err) {
      if(err.invalidSocketId) {
        return res.send(400);
      }

      return next(err);
    }

    res.send('OK');
  });
};
