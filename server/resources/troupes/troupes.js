/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService     = require("../../services/troupe-service");
var roomService       = require("../../services/room-service");
var restful           = require("../../services/restful");
var restSerializer    = require("../../serializers/rest-serializer");
var Q                 = require('q');

module.exports = {
  id: 'troupe',
  index: function(req, res, next) {
    restful.serializeTroupesForUser(req.user.id)
      .then(function(serialized) {
        res.send(serialized);
      })
      .fail(next);
  },

  show: function(req, res, next) {
    var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, mapUsers: true, includeRolesForTroupe: req.troupe });

    restSerializer.serialize(req.troupe, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send(serialized);
    });
  },

  update: function(req, res, next) {
    var troupe = req.troupe;
    var updatedTroupe = req.body;

    var promises = [];

    if(updatedTroupe.autoConfigureHooks) {
      promises.push(roomService.applyAutoHooksForRepoRoom(req.user, troupe));
    }

    if(updatedTroupe.hasOwnProperty('topic')) {
      promises.push(troupeService.updateTopic(req.user, troupe, updatedTroupe.topic));
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
