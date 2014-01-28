/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require("../../services/troupe-service");
var restSerializer = require("../../serializers/rest-serializer");
var recentRoomService = require('../../services/recent-room-service');
var Q = require('q');

module.exports = {
  base: 'troupes',
  id: 'userTroupe',
  index: function(req, res, next) {
    if(!req.user) {
      return res.send(403);
    }

    troupeService.findAllTroupesForUser(req.resourceUser.id, function(err, troupes) {
      if (err) return next(err);

      var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id });

      restSerializer.serialize(troupes, strategy, function(err, serialized) {
        if(err) return next(err);

        res.send(serialized);
      });
    });
  },

  show: function(req, res, next) {
    var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.resourceUser.id, mapUsers: true });

    restSerializer.serialize(req.userTroupe, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send(serialized);
    });
  },

  update: function(req, res, next) {
    var troupe = req.userTroupe;
    var updatedTroupe = req.body;
    var userId = req.user.id;
    var troupeId = troupe.id;
    var promises = [];

    if('favourite' in updatedTroupe) {
      promises.push(recentRoomService.updateFavourite(userId, troupeId, updatedTroupe.favourite));
    }

    if('lurk' in updatedTroupe) {
      promises.push(troupeService.updateTroupeLurkForUserId(userId, troupeId, updatedTroupe.lurk));
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
    var troupe = req.userTroupe;
    var userId = req.user.id;

    return recentRoomService.removeRecentRoomForUser(userId, troupe)
      .then(function() {
        res.send({ success: true });
      })
      .fail(next);
  },


  load: function(req, id, callback) {
    troupeService.findById(id, function(err, troupe) {
      if(err) return callback(500);
      if(!troupe) return callback(404);

      if(!troupeService.userHasAccessToTroupe(req.resourceUser, troupe)) {
        return callback(403);
      }

      return callback(null, troupe);
    });
  }

};
