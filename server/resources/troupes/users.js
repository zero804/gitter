/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restful = require('../../services/restful');
var recentRoomService  = require('../../services/recent-room-service');
var roomService        = require('../../services/room-service');
var emailAddressService = require('../../services/email-address-service');
var userService        = require("../../services/user-service");
var restSerializer     = require("../../serializers/rest-serializer");
var mongoUtils         = require('../../utils/mongo-utils');
var troupeService      = require("../../services/troupe-service");
var StatusError        = require('statuserror');

function maskEmail(email) {
  return email
    .split('@')
    .map(function (item, index) {
      if (index === 0) return item.slice(0, 4) + '****';
      return item;
    })
    .join('@');
}

module.exports = {
  id: 'resourceTroupeUser',

  index: function(req, res, next) {

    var options = {
      lean: !!req.query.lean
    };

    restful.serializeUsersForTroupe(req.troupe.id, req.user, options)
      .then(function (data) {
        res.send(data);
      })
      .catch(function (err) {
        next(err);
      });
  },

  create: function(req, res, next) {
    var username = req.body.username;
    var troupeId = req.troupe.id;

    // Switch a lean troupe object for a full mongoose object
    return troupeService.findById(troupeId)
      .then(function(troupe) {
        if(!troupe) throw new StatusError(404);

        return roomService.addUserToRoom(req.troupe, req.user, username);
      })
      .then(function(addedUser) {
        var strategy = new restSerializer.UserStrategy();

        return [
          restSerializer.serializeQ(addedUser, strategy),
          emailAddressService(addedUser)
        ];
      })
      .spread(function(serializedUser, email) {
        if (serializedUser.invited && email) {
          serializedUser.email = maskEmail(email);
        }

        res.send(200, { success: true, user: serializedUser });
      })
      .fail(next);
  },

  destroy: function(req, res, next){
    var user = req.resourceTroupeUser;
    var troupeId = req.troupe.id;

    // Switch a lean troupe object for a full mongoose object
    return troupeService.findById(troupeId)
      .then(function(troupe) {
        if(!troupe) throw new StatusError(404);

        return roomService.removeUserFromRoom(troupe, user, req.user);
      })
      .then(function() {
        recentRoomService.removeRecentRoomForUser(user.id, troupeId);
      })
      .then(function() {
        res.send({ success: true });
      })
      .catch(next);
  },

  load: function(req, userId, callback) {
    if(!mongoUtils.isLikeObjectId(userId)) return callback();

    return troupeService.findByIdLeanWithAccess(req.troupe.id, userId)
      .spread(function(troupe, access) {
        if (!access) return;

        return userService.findById(userId);
      })
      .nodeify(callback);
  }

};
