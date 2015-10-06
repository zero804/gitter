"use strict";

var roomService    = require("../../../services/room-service");
var restSerializer = require("../../../serializers/rest-serializer");

function serialize(items, req) {
  var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user && req.user.id });

  return restSerializer.serialize(items, strategy);
}

module.exports = {
  id: 'userChannel',

  index: function(req) {
    return roomService.findAllChannelsForUser(req.user)
      .then(function(channelTroupes) {
        return serialize(channelTroupes, req);
      });
  },

  create: function(req, res) {
    var body = req.body;
    var security = body.security || 'INHERITED';

    return roomService.createCustomChildRoom(null, req.user, { name: body.name, security: security })
      .then(function(customRoom) {
        return serialize(customRoom, req);
      })
      .catch(function(err) {
        if(err.clientDetail && err.responseStatusCode) {
          res.status(err.responseStatusCode);
          return err.clientDetail;
        }

        throw err;
      });
  }

};
