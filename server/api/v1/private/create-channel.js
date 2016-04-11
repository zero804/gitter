"use strict";

var roomService = require('../../../services/room-service');
var restSerializer = require("../../../serializers/rest-serializer");

module.exports = function(req, res, next) {
  var user = req.user;
  var ownerUri = req.body.ownerUri;
  var channelName = req.body.name;
  var channelSecurity = req.body.security || 'INHERITED';

  // silently create owner room
  return roomService.createGithubRoom(user, ownerUri)
    .then(function(ownerRoom) {
      // finally create channel
      return roomService.createCustomChildRoom(ownerRoom, user, { name: channelName, security: channelSecurity });
    }).then(function(customRoom) {
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
