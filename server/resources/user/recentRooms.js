/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restful = require("../../services/restful");
var troupeService = require('../../services/troupe-service');
var restSerializer = require('../../serializers/rest-serializer');
var Q = require('q');
var recentRoomService = require('../../services/recent-room-service');

module.exports = {
  base: 'recentRooms',
  id: 'recentRoom',
  index: function(req, res, next) {
    return restful.serializeRecentRoomsForUser(req.resourceUser.id)
      .then(function(serialized) {
        res.send(serialized);
      })
      .fail(next);
  },

  update: function(req, res, next) {
    var troupe = req.recentRoom;
    var updatedTroupe = req.body;
    var userId = req.user.id;
    var troupeId = troupe.id;
    var promises = [];

    if('favourite' in updatedTroupe) {
      promises.push(recentRoomService.updateFavourite(userId, troupeId, updatedTroupe.favourite));
    }

    return Q.all(promises)
      .then(function() {
        var strategy = new restSerializer.TroupeIdStrategy({ currentUserId: userId });

        return restSerializer.serializeQ(troupeId, strategy);
      })
      .then(function(troupe) {
        res.send(troupe);
      })
      .fail(next);
  },

  destroy: function(req, res, next) {
    var troupe = req.recentRoom;
    var userId = req.user.id;

    return recentRoomService.removeRecentRoomForUser(userId, troupe.id)
      .then(function() {
        res.send('OK');
      })
      .fail(next);
  },

  load: function(req, id, callback) {
    troupeService.findById(id)
      .then(function(troupe) {
        if(!troupe) return;

        if(!troupeService.userHasAccessToTroupe(req.resourceUser, troupe)) {
          throw 403;
        }

        return troupe;
      })
      .nodeify(callback);
  }

};
