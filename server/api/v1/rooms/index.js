"use strict";

var troupeService        = require("../../../services/troupe-service");
var roomService          = require("../../../services/room-service");
var restful              = require("../../../services/restful");
var restSerializer       = require("../../../serializers/rest-serializer");
var Q                    = require('q');
var StatusError          = require('statuserror');
var roomPermissionsModel = require('../../../services/room-permissions-model');
var userCanAccessRoom    = require('../../../services/user-can-access-room');
var paramLoaders         = require('./param-loaders');

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

      return restSerializer.serialize({ results: rooms }, strategy);
    })
    .then(function(searchResults) {
      res.send(searchResults);
    })
    .catch(next);
}

module.exports = {
  id: 'troupeId',
  index: function(req, res, next) {
    if (!req.user) {
      return next(new StatusError(401));
    }

    if(req.query.q) {
      return searchRooms(req, res, next);
    }

    restful.serializeTroupesForUser(req.user.id)
      .then(function(serialized) {
        res.send(serialized);
      })
      .catch(next);
  },

  show: function(req, res, next) {
    var strategy = new restSerializer.TroupeIdStrategy({ currentUserId: req.user && req.user.id });

    return restSerializer.serialize(req.params.troupeId, strategy)
      .then(function(serialized) {
        res.send(serialized);
      })
      .catch(next);
  },

  create: function(req, res, next) {
    var roomUri = req.query.uri || req.body.uri;
    var addBadge = req.body.addBadge || false;

    if (!roomUri) return next(new StatusError(400));

    return roomService.findOrCreateRoom(req.user, roomUri, { ignoreCase: true, addBadge: addBadge })
      .then(function (room) {
        if (!room || !room.troupe) throw new StatusError(403, 'Permission denied');

        var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, includeRolesForTroupe: room.troupe });

        return restSerializer.serialize(room.troupe, strategy);
      })
      .then(function(serialized) {
        res.send(serialized);
      })
      .catch(next);
  },

  update: [paramLoaders.troupeLoader, function(req, res, next) {
    var updatedTroupe = req.body;
    var troupe = req.troupe;

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

    if(updatedTroupe.hasOwnProperty('tags')) {
      promises.push(troupeService.updateTags(req.user, troupe, updatedTroupe.tags));
    }

    return Q.all(promises)
      .then(function() {
        var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id });

        return restSerializer.serialize(troupe, strategy);
      })
      .then(function(serialized) {
        res.send(serialized);
      })
      .catch(next);
  }],

  destroy: [paramLoaders.troupeLoader, function(req, res, next) {
    var user = req.user;
    var troupe = req.troupe;

    if (!troupe.uri) return next(new StatusError(400, 'cannot delete one to one rooms'));

    return roomPermissionsModel(user, 'admin', troupe)
      .then(function(isAdmin) {
        if (!isAdmin) throw new StatusError(403, 'admin permissions required');

        return roomService.deleteRoom(troupe);
      })
      .then(function() {
        res.sendStatus(200);
      })
      .catch(next);
  }],

  load: function(req, id, callback) {
    var userId = req.user && req.user._id;

    return userCanAccessRoom(userId, id)
      .then(function(access) {
        if (!access) throw new StatusError(404);

        if (access === 'view') {
          if (req.method === 'GET') {
            return id;
          } else {
            throw new StatusError(userId ? 403 : 401);
          }
        }

        if (access === 'member') {
          return id;
        }

        throw new StatusError(500, 'Unknown access type');
      })
      .nodeify(callback);
  },

  subresources: {
    'issues': require('./issues'),
    'users': require('./users'),
    'bans': require('./bans'),
    'channels': require('./channels'),
    'chatMessages': require('./chat-messages'),
    'collaborators': require('./collaborators'),
    'suggestedRooms': require('./suggested-rooms'),
    'events': require('./events')
  }

};
