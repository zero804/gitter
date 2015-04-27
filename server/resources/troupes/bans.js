/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var roomService        = require('../../services/room-service');
var userService        = require("../../services/user-service");
var restSerializer     = require("../../serializers/rest-serializer");
var _                  = require("underscore");

function serialize(bans, callback) {
  var strategy = new restSerializer.TroupeBanStrategy({ });

  restSerializer.serializeExcludeNulls(bans, strategy, callback);
}

module.exports = {
  id: 'troupeBan',

  index: function(req, res, next) {
    serialize(req.troupe.bans, function(err, serialized) {
      if(err) return next(err);
      res.send(serialized);
    });
  },

  create: function(req, res, next) {
    var username = req.body.username;
    var removeMessages = !!req.body.removeMessages;

    return roomService.banUserFromRoom(req.troupe, username, req.user, { removeMessages: removeMessages }, function(err, ban) {
      if(err) return next(err);

      serialize(ban, function(err, serialized) {
        if(err) return next(err);
        res.send(serialized);
      });

    });

  },

  show: function(req, res, next) {
    serialize(req.troupeBan, function(err, serialized) {
      if(err) return next(err);
      res.send(serialized);
    });
  },

  destroy: function(req, res, next) {
    return roomService.unbanUserFromRoom(req.troupe, req.troupeBan, req.troupeBanUser.username, req.user, function(err) {
      if(err) return next(err);
      res.send({ success: true });
    });
  },

  load: function(req, id, callback) {
    /* id of a ban is the username of the banned user */

    return userService.findByUsername(id, function(err, user) {
      if(err) return callback(err);
      if(!user) return callback();

      req.troupeBanUser = user;

      var ban = _.find(req.troupe.bans, function(ban) { return ban.userId == user.id;} );
      return callback(null, ban);
    });
  }

};
