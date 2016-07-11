'use strict';

var roomService = require("../../services/room-service");
var restSerializer = require("../../serializers/rest-serializer");
var Promise = require('bluebird');
var StatusError = require('statuserror');

function createRepoRoom(req, res, next) {
  return Promise.try(function() {
      var roomUri = req.query.uri || req.body.uri;
      roomUri = roomUri ? String(roomUri) : undefined;

      var addBadge = req.body.addBadge || false;

      if (!roomUri) throw new StatusError(400);

      // TODO: change this to a simple resolve,
      // except in the case of a user
      return roomService.createRoomByUri(req.user, roomUri, { ignoreCase: true, addBadge: addBadge });
    })
    .then(function (createResult) {
      var strategy = new restSerializer.TroupeStrategy({
        currentUserId: req.user.id,
        currentUser: req.user,
        includeRolesForTroupe: createResult.troupe,
        // include all these because it will replace the troupe in the context
        includeTags: true,
        includeProviders: true,
        includeGroups: true
      });

      return [createResult, restSerializer.serializeObject(createResult.troupe, strategy)];
    })
    .spread(function(createResult, serialized) {
      serialized.extra = {
        didCreate: createResult.didCreate,
        hookCreationFailedDueToMissingScope: createResult.hookCreationFailedDueToMissingScope
      };

      res.send(serialized);
    })
    .catch(next)
}

module.exports = createRepoRoom;
