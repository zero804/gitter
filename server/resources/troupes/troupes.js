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
    var strategyOptions = { currentUserId: req.user.id };

    if (req.query.include_users) strategyOptions.mapUsers = true;
    var strategy = new restSerializer.TroupeStrategy(strategyOptions);

    restSerializer.serialize(req.troupe, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send(serialized);
    });
  },

  create: function(req, res, next) {
    var roomUri = req.query.uri || req.body.uri;
    if (!roomUri) return res.send('400', {error: 'Missing Room URI'});

    return roomService.findOrCreateRoom(req.user, roomUri, {ignoreCase: true}).then(function(room) {
      if (!room.troupe) { return res.send({allowed: false}); }

      var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, mapUsers: true, includeRolesForTroupe: room.troupe });
      restSerializer.serialize(room.troupe, strategy, function(err, serialized) {
        console.log(serialized);
        if (err) return next(err);

        res.send({allowed: true, room: serialized});
      });

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
