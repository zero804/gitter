/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var presenceService = require('../../services/presence-service');

module.exports = {
  destroy: function(req, res, next) {
    var socketId = req.socket;

    presenceService.socketDisconnectionRequested(req.user.id, socketId, function(err) {
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
  },

  load: function(id, done) {
    return done(null, id);
  }

};