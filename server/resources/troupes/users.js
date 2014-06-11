/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var recentRoomService  = require('../../services/recent-room-service');
var roomService        = require('../../services/room-service');
var troupeService      = require("../../services/troupe-service");
var userService        = require("../../services/user-service");
var restSerializer     = require("../../serializers/rest-serializer");
var appEvents          = require("../../app-events");
var _                  = require("underscore");
var Q                  = require("q");

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
    var usernames = req.body.usernames;

    return roomService.addUsersToRoom(req.troupe, req.user, usernames)
      .then(function() {
        res.send(200, { success: true });
      })
      .fail(next);

  },

  destroy: function(req, res, next){
    var user = req.resourceTroupeUser;
    var userId = user.id;
    var troupeId = req.troupe._id;

    var remove = function() {
      Q.all([
        recentRoomService.removeRecentRoomForUser(userId, req.troupe),
        troupeService.removeUserFromTroupe(troupeId, userId)
      ])
      .then(function() {
        appEvents.userLeft({user: req.user, room: req.troupe});
        res.send({ success: true });
      })
      .catch(next);
    };

    if(req.user.id === userId) { // User chooses to leave the room
      remove();
    }
    else { // User is removed by another user, check permissions
      roomService.removeUserFromRoom(req.troupe, user, req.user).done(remove, next);
    }
  },

  load: function(req, id, callback) {
    var userInTroupeId = _.find(req.troupe.getUserIds(), function(v) { return v == id;} );
    userService.findById(userInTroupeId, callback);
  }

};
