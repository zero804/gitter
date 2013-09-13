/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService     = require("../../services/troupe-service");
var restSerializer    = require("../../serializers/rest-serializer");

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
      var invite = req.body;

      return troupeService.createInvite(req.troupe, {
          fromUser: req.user,
          email: invite.email,
          displayName: invite.displayName,
          userId: invite.userId
        })
        .then(function(result) {
          if(result.ignored) return res.send(result);

          var strategy = new restSerializer.InviteStrategy({ currentUserId: req.user.id });
          restSerializer.serialize(result, strategy, function(err, serialized) {
            if(err) return next(err);

            res.send(serialized);
          });

        }, next);

    },

    destroy: function(req, res) {
      req.invite.remove(function() {
        res.send({ success: true });
      });
    },

    load: function(id, callback){
      troupeService.findInviteById(id, callback);
    }

};
