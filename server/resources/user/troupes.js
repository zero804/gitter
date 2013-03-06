/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require("../../services/troupe-service");
var restSerializer = require("../../serializers/rest-serializer");

module.exports = {
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

    restSerializer.serialize(req.troupe, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send(serialized);
    });
  },

  load: function(req, id, callback) {
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
