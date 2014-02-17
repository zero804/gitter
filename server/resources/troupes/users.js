/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var recentRoomService  = require('../../services/recent-room-service');
var troupeService      = require("../../services/troupe-service");
var userService        = require("../../services/user-service");
var restSerializer     = require("../../serializers/rest-serializer");
var _                  = require("underscore");
var Q                  = require("q");

var redis = require('../../utils/redis');
var redisClient = redis.createClient();

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

  destroy: function(req, res, next){
    var user = req.resourceTroupeUser;
    if(req.user.id != user.id) {
      // For now, you can only remove yourself from the room
      return next(401);
    }
    var troupeId = req.troupe._id;
    var userId = user.id;
    Q.all([
        recentRoomService.removeRecentRoomForUser(userId, req.troupe),
        troupeService.removeUserFromTroupe(troupeId, userId)
      ])
      .then(function() {

        var msg_data = {user: req.user, room: req.troupe};
        redisClient.publish('user_left', JSON.stringify(msg_data));

        res.send({ success: true });
      })
      .fail(next);

  },

  load: function(req, id, callback) {
    var userInTroupeId = _.find(req.troupe.getUserIds(), function(v) { return v == id;} );
    userService.findById(userInTroupeId, callback);
  }

};
