"use strict";

var roomService = require("../../../services/room-service");
var restSerializer = require("../../../serializers/rest-serializer");
var loadTroupeFromParam = require('./load-troupe-param');
var RoomWithPolicyService = require('../../../services/room-with-policy-service');
var StatusError = require('statuserror');

function serialize(items, req) {
  var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id });

  return restSerializer.serialize(items, strategy);
}

function serializeObject(item, req) {
  var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id });

  return restSerializer.serializeObject(item, strategy);
}

module.exports = {
  id: 'channel',
  index: function(req) {
    return roomService.findAllChannelsForRoomId(req.user, req.params.troupeId)
      .then(function(channelTroupes) {
        return serialize(channelTroupes, req);
      });
  },

  create: function(req, res) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {

        var body = req.body;
        var security = body.security || 'INHERITED';

        var roomWithPolicyService = new RoomWithPolicyService(troupe, req.user, req.userRoomPolicy);
        return roomWithPolicyService.createChannel({ name: body.name, security: security });
      })
      .then(function(customRoom) {
        return serializeObject(customRoom, req);
      })
      .catch(StatusError, function(err) {
        if(err.clientDetail) {
          res.status(err.status);
          return err.clientDetail;
        }

        throw err;
      });
  },

  load: function(req, id) {
    return roomService.findChildChannelRoom(req.user, req.params.troupeId, id);
  }

};
