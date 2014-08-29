/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var roomService     = require('../../services/room-service');
var restSerializer  = require("../../serializers/rest-serializer");

module.exports =  function(req, res) {

  var roomUri = req.query.room;

  roomService.findOrCreateRoom(req.user, roomUri, { ignoreCase: true }).then(function(room) {
    if (!room.troupe) {
      res.send({allowed: false});
      return;
    }

    var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, mapUsers: true, includeRolesForTroupe: room.troupe });
    restSerializer.serialize(room.troupe, strategy, function(err, serialized) {
      if (err) {
        res({allowed: false});
        return;
      }

      res.send({allowed: true, room: serialized});
    });

  });

};

