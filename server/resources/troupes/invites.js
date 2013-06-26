/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require("../../services/troupe-service"),
    restSerializer = require("../../serializers/rest-serializer"),
    Fiber = require("../../utils/fiber");

module.exports = {
    index: function(req, res, next) {
      troupeService.findAllUnusedInvitesForTroupe(req.troupe.id, function(err, invites) {
        if(err) return next(err);

        var strategy = new restSerializer.InviteStrategy({ currentUserId: req.user.id, troupeId: req.troupe.id });

        restSerializer.serialize(invites, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });

      });
    },

    create: function(req, res, next) {
      var invites = req.body;
      var f = new Fiber();

      for(var i = 0; i < invites.length; i++) {
        var invite = invites[i];

        troupeService.inviteUserToTroupe(req.troupe, {
            fromUser: req.user,
            email: invite.email,
            displayName: invite.displayName,
            userId: invite.userId
          }, f.waitor());

      }

      f.all().then(function() {
        res.send(invites);
      }, next);

    },

    load: function(id, callback){
      troupeService.findInviteById(id, callback);
    }

};
