"use strict";

var roomService         = require('../../../services/room-service');
var restSerializer      = require("../../../serializers/rest-serializer");
var loadTroupeFromParam = require('./load-troupe-param');

function serialize(bans) {
  var strategy = new restSerializer.TroupeBanStrategy({ });
  return restSerializer.serialize(bans, strategy);
}

module.exports = {
  id: 'troupeBan',

  index: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        return serialize(troupe.bans);
      });
  },

  create: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        var username = req.body.username;
        var removeMessages = !!req.body.removeMessages;

        return roomService.banUserFromRoom(troupe, username, req.user, { removeMessages: removeMessages });
      })
      .then(function(ban) {
        return serialize(ban);
      });
  },

  show: function(req) {
    return serialize(req.troupeBan);
  },

  destroy: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        return roomService.unbanUserFromRoom(troupe, req.troupeBan, req.troupeBanUser.username, req.user);
      })
      .then(function() {
        return { success: true };
      });
  },

  load: function(req, id) {
    return roomService.findBanByUsername(req.params.troupeId, id)
      .then(function(banAndUser) {
        if(!banAndUser) return;

        /* Bit nasty */
        req.troupeBanUser = banAndUser.user;

        return banAndUser.ban;
      });
  }

};
