/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var presenceService = require('../../services/presence-service');
var bayeux = require('../../web/bayeux');
var winston = require('../../utils/winston');

module.exports =  function(req, res, next) {
  var socketId = req.body.socketId;
  var on = parseInt(req.body.on, 10);

  bayeux.engine.clientExists(socketId, function(exists) {
    if(!exists) {
      winston.warn('eyeball: socket ' + socketId + ' does not exist. ');
      return res.send(400);
    }

    presenceService.clientEyeballSignal(req.user.id, socketId, on, function(err) {
      if(err) {
        if(err.invalidSocketId) {
          winston.warn('eyeball: socket ' + socketId + ' exists in the faye engine, but not in the presence service.');
          bayeux.destroyClient(socketId);

          return res.send(400);
        }

        return next(err);
      }

      res.format({
        text: function() {
          res.send('OK');
        },
        json: function() {
          res.send({ success: true });
        },
        html: function() {
          res.send('OK');
        }
      });

    });

  });

};

