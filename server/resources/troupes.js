/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
  userService = require("../services/user-service"),
  collections = require("../utils/collections"),
  restSerializer = require("../serializers/rest-serializer");


var predicates = collections.predicates;


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

  "new": function(req, res) {
    res.send('new troupe');
  },

  create: function(req, res) {
    res.send('create troupe');
  },

  show: function(req, res, next) {
    var strategy = new restSerializer.TroupeStrategy({ mapUsers: true });

    restSerializer.serialize(req.troupe, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send(serialized);
    });
  },

  edit: function(req, res) {
    res.send('edit forum ' + req.troupe.title);
  },

  update: function(req, res) {
    res.send('update forum ' + req.troupe.title);
  },

  destroy: function(req, res) {
    res.send('destroy forum ' + req.troupe.title);
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
