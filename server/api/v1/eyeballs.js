/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var presenceService = require('../../services/presence-service');

module.exports = {
  create: function(req, res, next) {
    var socketId = req.body.socketId;
    var on = parseInt(req.body.on, 10);

    presenceService.clientEyeballSignal(req.user.id, socketId, on, function(err) {
      if(err) {
        if(err.invalidSocketId) {
          return res.send(400);
        }

        if(err.lockFail) {
          return res.send(200, 'OK');
        }

        return next(err);
      }

      res.send('OK');
    });
  }

};