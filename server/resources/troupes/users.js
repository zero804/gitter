/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require("../../services/troupe-service"),
    userService = require("../../services/user-service"),
    restSerializer = require("../../serializers/rest-serializer"),
    _ = require("underscore");

module.exports = {
    index: function(req, res, next) {
      var strategy = new restSerializer.UserIdStrategy( { showPresenceForTroupeId: req.troupe.id });

      restSerializer.serialize(req.troupe.getUserIds(), strategy, function(err, serialized) {
        if(err) return next(err);
        res.send(serialized);
      });
    },

    destroy: function(req, res, next){
      var user = req.user; // NB NB NB, not the usual req.user, but the req.RESOURCEish user. Capish?
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
