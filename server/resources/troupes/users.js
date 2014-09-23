/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var recentRoomService  = require('../../services/recent-room-service');
var roomService        = require('../../services/room-service');
var emailAddressService = require('../../services/email-address-service');
var userService        = require("../../services/user-service");
var restSerializer     = require("../../serializers/rest-serializer");
var appEvents          = require("../../app-events");
var _                  = require("underscore");

module.exports = {
  id: 'resourceTroupeUser',

  index: function(req, res, next) {
    var strategy = new restSerializer.UserIdStrategy({
      showPresenceForTroupeId: req.troupe.id,
      includeRolesForTroupe: req.troupe,
      currentUser: req.user
    });

    restSerializer.serializeExcludeNulls(req.troupe.getUserIds(), strategy, function(err, serialized) {
      if(err) return next(err);
      res.send(serialized);
    });
  },

  create: function(req, res, next) {
    var username = req.body.username;

    return roomService.addUserToRoom(req.troupe, req.user, username)
      .then(function(userAdded) {

        var strategy = new restSerializer.UserStrategy();

        return [
          restSerializer.serializeQ(userAdded, strategy),
          emailAddressService(userAdded, req.user)
        ];
      })
      .spread(function(serializedUser, email) {

        if(serializedUser.invited && email) {
          serializedUser.email = email;
        }

        res.send(200, { success: true, user: serializedUser });
      })
      .fail(next);
  },

  destroy: function(req, res, next){
    var user = req.resourceTroupeUser;

    return roomService.removeUserFromRoom(req.troupe, user, req.user)
      .then(function() {
        recentRoomService.removeRecentRoomForUser(user.id, req.troupe);
      })
      .then(function() {
        appEvents.userLeft({user: req.user, room: req.troupe});
        res.send({ success: true });
      })
      .catch(next);
  },

  load: function(req, id, callback) {
    var userInTroupeId = _.find(req.troupe.getUserIds(), function(v) { return v == id;} );
    userService.findById(userInTroupeId, callback);
  }

};
