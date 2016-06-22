"use strict";

var roomService = require("../../../services/room-service");
var restSerializer = require("../../../serializers/rest-serializer");
var StatusError = require('statuserror');

function serialize(items, req) {
  var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user && req.user.id });

  return restSerializer.serialize(items, strategy);
}

function serializeObject(item, req) {
  var strategy = new restSerializer.TroupeStrategy({
    currentUserId: req.user && req.user.id,
    // include all these because it will replace the troupe in the context
    includeTags: true,
    includeProviders: true,
    includeGroups: true
  });

  return restSerializer.serializeObject(item, strategy);
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

    return roomService.createUserChannel(req.user, { name: body.name, security: security })
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
  }

};
