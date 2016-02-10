"use strict";

var roomService = require('../../../services/room-service');
var restSerializer = require("../../../serializers/rest-serializer");

function serialize(items, req, res, next) {

  var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id });

  restSerializer.serialize(items, strategy, function(err, serialized) {
    if(err) return next(err);

    res.send(serialized);
  });

}

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
      return serialize(customRoom, req, res, next);
    })
    .catch(function(err) {
      if(err.clientDetail && err.responseStatusCode) {
        res.status(err.responseStatusCode).send(err.clientDetail);
      } else {
        next(err);
      }
    });
};
