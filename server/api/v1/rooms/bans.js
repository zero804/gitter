"use strict";

var roomService        = require('../../../services/room-service');
var restSerializer     = require("../../../serializers/rest-serializer");
var paramLoaders       = require('./param-loaders');

function serialize(bans, callback) {
  var strategy = new restSerializer.TroupeBanStrategy({ });

  restSerializer.serializeExcludeNulls(bans, strategy, callback);
}

module.exports = {
  id: 'troupeBan',

  index: [paramLoaders.troupeLoader, function(req, res, next) {
    serialize(req.troupe.bans, function(err, serialized) {
      if(err) return next(err);
      res.send(serialized);
    });
  }],

  create: [paramLoaders.troupeLoader, function(req, res, next) {
    var username = req.body.username;
    var removeMessages = !!req.body.removeMessages;

    return roomService.banUserFromRoom(req.troupe, username, req.user, { removeMessages: removeMessages }, function(err, ban) {
      if(err) return next(err);

      serialize(ban, function(err, serialized) {
        if(err) return next(err);
        res.send(serialized);
      });

    });

  }],

  show: function(req, res, next) {
    serialize(req.troupeBan, function(err, serialized) {
      if(err) return next(err);
      res.send(serialized);
    });
  },

  destroy: [paramLoaders.troupeLoader, function(req, res, next) {
    return roomService.unbanUserFromRoom(req.troupe, req.troupeBan, req.troupeBanUser.username, req.user, function(err) {
      if(err) return next(err);
      res.send({ success: true });
    });
  }],

  load: function(req, id, callback) {
    return roomService.findBanByUsername(req.params.troupeId, id)
      .then(function(banAndUser) {
        if(!banAndUser) return;

        /* Bit nasty */
        req.troupeBanUser = banAndUser.user;

        return banAndUser.ban;
      })
      .nodeify(callback);
  }

};
