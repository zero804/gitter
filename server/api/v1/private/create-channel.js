"use strict";

var roomService = require('../../../services/room-service');
var restSerializer = require("../../../serializers/rest-serializer");
var policyFactory = require('gitter-web-permissions/lib/legacy-policy-factory');
var RoomWithPolicyService = require('../../../services/room-with-policy-service');

/**
 * TODO: this endpoint will go once we break way from
 * GitHub URIs
 */
module.exports = function(req, res, next) {
  var user = req.user;
  var ownerUri = req.body.ownerUri;
  var channelName = req.body.name;
  var channelSecurity = req.body.security || 'INHERITED';

  // silently create owner room
  return roomService.createRoomForGitHubUri(user, ownerUri, { skipPostCreationSteps: true })
    .then(function(result) {
      var ownerRoom = result.troupe;
      return [ownerRoom, policyFactory.createPolicyForRoom(req.user, ownerRoom)];
    })
    .spread(function(ownerRoom, policy) {
      var roomWithPolicyService = new RoomWithPolicyService(ownerRoom, user, policy);
      return roomWithPolicyService.createChannel({ name: channelName, security: channelSecurity });
    })
    .then(function(customRoom) {
      var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id });
      return restSerializer.serializeObject(customRoom, strategy);
    })
    .then(function(serialized) {
      res.send(serialized);
    })
    .catch(function(err) {
      if(err.clientDetail && err.responseStatusCode) {
        res.status(err.responseStatusCode).send(err.clientDetail);
      } else {
        next(err);
      }
    });
};
