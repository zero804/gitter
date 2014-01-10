/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService  = require("../../services/troupe-service");
var userService    = require("../../services/user-service");
var restSerializer = require("../../serializers/rest-serializer");
var _              = require("underscore");

module.exports = {
  id: 'resourceTroupeUser',

  index: function(req, res, next) {
    var strategy = new restSerializer.UserIdStrategy({
      showPresenceForTroupeId: req.troupe.id,
      includeRolesForTroupe: req.troupe,
      currentUser: req.user
    });

    restSerializer.serialize(req.troupe.getUserIds(), strategy, function(err, serialized) {
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

    troupeService.removeUserFromTroupe(req.troupe._id, user.id, function (err) {
    if(err) return next(err);
      res.send({ success: true });
    });
  },

  load: function(req, id, callback) {
    var userInTroupeId = _.find(req.troupe.getUserIds(), function(v) { return v == id;} );
    userService.findById(userInTroupeId, callback);
  }

};
