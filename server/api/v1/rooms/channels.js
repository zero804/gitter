"use strict";

var roomService    = require("../../../services/room-service");
var restSerializer = require("../../../serializers/rest-serializer");
var paramLoaders   = require('./param-loaders');

function serialize(items, req, res, next) {

  var strategy = new restSerializer.TroupeStrategy({ currentUserId: req.user.id });

  restSerializer.serialize(items, strategy, function(err, serialized) {
    if(err) return next(err);

    res.send(serialized);
  });

}

module.exports = {
  id: 'channel',
  index: function(req, res, next){
    roomService.findAllChannelsForRoomId(req.user, req.params.troupeId)
      .then(function(channelTroupes) {
        serialize(channelTroupes, req, res, next);
      })
      .catch(next);
  },

  create: [paramLoaders.troupeLoader, function(req, res, next) {
    var body = req.body;
    var security = body.security || 'INHERITED';

    return roomService.createCustomChildRoom(req.troupe, req.user, { name: body.name, security: security })
      .then(function(customRoom) {
        return serialize(customRoom, req, res, next);
      })
      .catch(function(err) {
        if(err.clientDetail && err.responseStatusCode) {
          res.status(err.responseStatusCode).send(err.clientDetail);
        } else {
          next(err);
        }
      });
  }],

  load: function(req, id, callback){
    roomService.findChildChannelRoom(req.user, req.params.troupeId, id)
      .nodeify(callback);
  }

};
