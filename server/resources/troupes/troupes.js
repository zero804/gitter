/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var troupeService = require("../../services/troupe-service"),
  restSerializer = require("../../serializers/rest-serializer");

module.exports = {
  index: function(req, res, next) {
    if(!req.user) {
      return res.send(403);
    }

    troupeService.findAllTroupesForUser(req.user.id, function(err, troupes) {
      if (err) return next(err);

      var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id });

      restSerializer.serialize(troupes, strategy, function(err, serialized) {
        if(err) return next(err);

        res.send(serialized);
      });
    });
  },

  show: function(req, res, next) {
    var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, mapUsers: true });

    restSerializer.serialize(req.troupe, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send(serialized);
    });
  },

  update: function(req, res, next) {
    var troupe = req.troupe;
    var updatedTroupe = req.body;
    var name = updatedTroupe.name;
    troupeService.updateTroupeName(troupe.id, name, function(err, troupe) {
      if (err) return next(err);

      var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, mapUsers: false });

      restSerializer.serialize(troupe, strategy, function(err, serialized) {
        if(err) return next(err);

        res.send(serialized);
      });
    });
  },

  load: function(req, id, callback) {
    if(!req.user) return callback(401);

    troupeService.findById(id, function(err, troupe) {
      if(err) return callback(500);
      if(!troupe) return callback(404);

      if(!troupeService.userHasAccessToTroupe(req.user, troupe)) {
        return callback(403);
      }

      return callback(null, troupe);
    });
  }

};
