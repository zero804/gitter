"use strict";

var troupeService        = require("../../../services/troupe-service");
var troupeMetaService = require('../../../services/room-meta-service');
var roomService          = require("../../../services/room-service");
var restful              = require("../../../services/restful");
var restSerializer       = require("../../../serializers/rest-serializer");
var Promise              = require('bluebird');
var StatusError          = require('statuserror');
var roomPermissionsModel = require('gitter-web-permissions/lib/room-permissions-model');
var userCanAccessRoom    = require('gitter-web-permissions/lib/user-can-access-room');
var loadTroupeFromParam  = require('./load-troupe-param');

function searchRooms(req) {
  var user = req.user;

  var options = {
    limit: parseInt(req.query.limit, 10) || 10,
    skip: parseInt(req.query.skip, 10)
  };

  var userId = user && user.id;
  return roomService.searchRooms(userId, req.query.q, options)
    .then(function(rooms) {
      var strategy = new restSerializer.SearchResultsStrategy({
        resultItemStrategy: new restSerializer.TroupeStrategy({
          currentUserId: userId
        })
      });

      return restSerializer.serializeObject({ results: rooms }, strategy);
    });
}

module.exports = {
  id: 'troupeId',
  index: function(req) {
    if (!req.user) {
      throw new StatusError(401);
    }

    if(req.query.q) {
      return searchRooms(req);
    }

    return restful.serializeTroupesForUser(req.user.id);
  },

  show: function(req) {
    var strategy = new restSerializer.TroupeIdStrategy({
      currentUserId: req.user && req.user.id,
      includeTags: true,
      includeProviders: true
    });

    return restSerializer.serializeObject(req.params.troupeId, strategy);
  },

  create: function(req) {
    var roomUri = req.query.uri || req.body.uri;
    var addBadge = req.body.addBadge || false;

    if (!roomUri) throw new StatusError(400);

    return roomService.findOrCreateRoom(req.user, roomUri, {ignoreCase: true, addBadge: addBadge})
      .then(function (room) {
        if (!room || !room.troupe) throw new StatusError(403, 'Permission denied');

        var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id, includeRolesForTroupe: room.troupe });

        return restSerializer.serializeObject(room.troupe, strategy)
        .then(function(serialized) {

          serialized.extra = {
            access: room.access,
            didCreate: room.didCreate,
            hookCreationFailedDueToMissingScope: room.hookCreationFailedDueToMissingScope
          };

          return serialized;
        });
    });
  },

  update: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        var updatedTroupe = req.body;

        var promises = [];

        if(updatedTroupe.autoConfigureHooks) {
          promises.push(roomService.applyAutoHooksForRepoRoom(req.user, troupe));
        }

        if(updatedTroupe.hasOwnProperty('topic')) {
          promises.push(troupeService.updateTopic(req.user, troupe, updatedTroupe.topic));
        }

        if(updatedTroupe.hasOwnProperty('providers')) {
          promises.push(troupeService.updateProviders(req.user, troupe, updatedTroupe.providers));
        }

        if(updatedTroupe.hasOwnProperty('noindex')) {
          promises.push(troupeService.toggleSearchIndexing(req.user, troupe, updatedTroupe.noindex));
        }

        if(updatedTroupe.hasOwnProperty('tags')) {
          promises.push(troupeService.updateTags(req.user, troupe, updatedTroupe.tags));
        }

        if(updatedTroupe.hasOwnProperty('welcomeMessage')) {
          promises.push(troupeMetaService.createNewMetaRecord(troupe.id, updatedTroupe));
        }


        return Promise.all(promises);
      })
      .then(function() {
        var strategy = new restSerializer.TroupeIdStrategy({
          currentUserId: req.user.id,
          currentUser: req.user,
          includePermissions: true,
          includeOwner: true,
          includeProviders: true
        });

        return restSerializer.serializeObject(req.params.troupeId, strategy);
      });
  },

  destroy: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        var user = req.user;

        if (!troupe.uri) throw new StatusError(400, 'cannot delete one to one rooms');

        return [troupe, roomPermissionsModel(user, 'admin', troupe)];
      })
      .spread(function(troupe, isAdmin) {
        if (!isAdmin) throw new StatusError(403, 'admin permissions required');

        return roomService.deleteRoom(troupe);
      })
      .then(function() {
        return { success: true };
      });
  },

  load: function(req, id) {
    var userId = req.user && req.user._id;

    var permsPromise = req.method === 'GET' ?
      userCanAccessRoom.permissionToRead(userId, id) :
      userCanAccessRoom.permissionToWrite(userId, id);

    return permsPromise.then(function(access) {
      if (access) {
        return id;
      } else {
        throw new StatusError(userId ? 403 : 401);
      }
    });
  },

  subresources: {
    'issues': require('./issues'),
    'users': require('./users'),
    'bans': require('./bans'),
    'channels': require('./channels'),
    'chatMessages': require('./chat-messages'),
    'collaborators': require('./collaborators'),
    'suggestedRooms': require('./suggested-rooms'),
    'events': require('./events'),
    'meta': require('./meta')
  }

};
