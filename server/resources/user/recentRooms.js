/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var recentRoomService = require("../../services/recent-room-service");
var restSerializer = require("../../serializers/rest-serializer");

module.exports = {
  base: 'recentRooms',
  id: 'recentRoom',
  index: function(req, res, next) {
    recentRoomService.generateRoomListForUser(req.resourceUser)
      .then(function(rooms) {
        var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id });

        restSerializer.serialize(rooms, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });
      })
      .fail(next);
  },

  load: function(req, id, callback) {
    // TODO: fix
    callback(null, true);

    // troupeService.findById(id, function(err, troupe) {
    //   if(err) return callback(500);
    //   if(!troupe) return callback(404);

    //   if(!troupeService.userHasAccessToTroupe(req.resourceUser, troupe)) {
    //     return callback(403);
    //   }

    //   return callback(null, troupe);
    // });
  }

};
