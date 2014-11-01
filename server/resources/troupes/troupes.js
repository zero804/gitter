/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService     = require("../../services/troupe-service");
var roomService       = require("../../services/room-service");
var restful           = require("../../services/restful");
var restSerializer    = require("../../serializers/rest-serializer");
var Q                 = require('q');
var mongoUtils        = require('../../utils/mongo-utils');
var StatusError       = require('statuserror');


function searchRooms(req, res, next) {
  var user = req.user;

  var options = {
    limit: req.query.limit || 10,
    skip: req.query.skip
  };

  var userId = user && user.id;
  return roomService.searchRooms(userId, req.query.q, options)
    .then(function(rooms) {
      var strategy = new restSerializer.SearchResultsStrategy({
        resultItemStrategy: new restSerializer.TroupeStrategy({ currentUserId: userId })
      });

      return restSerializer.serializeQ({ results: rooms }, strategy);
    })
    .then(function(searchResults) {
      res.send(searchResults);
    })
    .fail(next);
}

module.exports = {
  id: 'troupe',
  index: function(req, res, next) {
    if(req.query.q) {
      return searchRooms(req, res, next);
    }

    restful.serializeTroupesForUser(req.user.id)
      .then(function(serialized) {
        res.send(serialized);
      })
      .fail(next);
  },

  show: function(req, res, next) {
    var strategyOptions = { currentUserId: req.user && req.user.id };

    if (req.query.include_users) strategyOptions.mapUsers = true;
    var strategy = new restSerializer.TroupeStrategy(strategyOptions);

    return restSerializer.serialize(req.troupe, strategy)
      .then(function(serialized) {
        res.send(serialized);
      })
      .fail(next);
  },

  create: function(req, res, next) {
    var roomUri = req.query.uri || req.body.uri;
    var addBadge = req.body.addBadge || false;

    if (!roomUri) return next(new StatusError(400));

    return roomService.findOrCreateRoom(req.user, roomUri, { ignoreCase: true, addBadge: addBadge })
      .then(function (room) {
        if (!room || !room.troupe) throw new StatusError(403, 'Permission denied');

        var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, mapUsers: true, includeRolesForTroupe: room.troupe });

        return restSerializer.serialize(room.troupe, strategy);
      })
      .then(function(serialized) {
        res.send(serialized);
      })
      .fail(next);
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

    if(updatedTroupe.hasOwnProperty('noindex')) {
      promises.push(troupeService.toggleSearchIndexing(req.user, troupe, updatedTroupe.noindex));
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
    /* Invalid id? Return 404 */
    if(!mongoUtils.isLikeObjectId(id)) return callback();

    troupeService.findById(id, function(err, troupe) {
      if(err) return callback(new StatusError(500));
      if(!troupe) return callback(new StatusError(404));

      if(troupe.status != 'ACTIVE') return callback(new StatusError(404));

      if(troupe.security === 'PUBLIC' && req.method === 'GET') {
        return callback(null, troupe);
      }

      /* From this point forward we need a user */
      if(!req.user) {
        return callback(new StatusError(401));
      }

      if(!troupeService.userHasAccessToTroupe(req.user, troupe)) {
        return callback(new StatusError(403));
      }

      return callback(null, troupe);
    });
  }

};
