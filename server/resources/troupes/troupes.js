/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require("../../services/troupe-service");
var roomService = require("../../services/room-service");
var restSerializer = require("../../serializers/rest-serializer");
var Q = require('q');

module.exports = {
  index: function(req, res, next) {
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

  create: function(req, res, next) {
    var newTroupe = req.body;
    var name = newTroupe.troupeName || newTroupe.name;
    var oneToOneTroupeId = newTroupe.oneToOneTroupeId;
    var invites = newTroupe.invites;

    troupeService.createNewTroupeForExistingUser({
      user: req.user,
      name: name,
      oneToOneTroupeId: oneToOneTroupeId,
      invites: invites
    }, function(err, troupe) {
      if(err) return next(err);

      var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, mapUsers: true });
      restSerializer.serialize(troupe, strategy, function(err, serialized) {
        if(err) return next(err);

        res.send(serialized);
      });
    });

  },

  update: function(req, res, next) {
    var troupe = req.troupe;
    var updatedTroupe = req.body;

    var promises = [];

    if(updatedTroupe.hasOwnProperty('favourite')) {
      promises.push(troupeService.updateFavourite(req.user.id, troupe.id, updatedTroupe.favourite));
    }

    if(updatedTroupe.autoConfigureHooks) {
      promises.push(roomService.applyAutoHooksForRepoRoom(req.user, troupe));
    }

    Q.all(promises)
      .then(function() {
        troupeService.findById(troupe.id, function(err, troupe) {

          var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, mapUsers: false });

          restSerializer.serialize(troupe, strategy, function(err, serialized) {
            if(err) return next(err);

            res.send(serialized);
          });

        });

      })
      .catch(next);

  },

  destroy: function(req, res, next) {
    troupeService.deleteTroupe(req.troupe, function(err) {
      if(err) return next(err);

      res.send({ success: true });
    });
  },

  load: function(req, id, callback) {
    if(!req.user) return callback(401);

    troupeService.findById(id, function(err, troupe) {
      if(err) return callback(500);
      if(!troupe) return callback(404);

      if(troupe.status != 'ACTIVE') return callback(404);

      if(!troupeService.userHasAccessToTroupe(req.user, troupe)) {
        return callback(403);
      }

      return callback(null, troupe);
    });
  }

};
