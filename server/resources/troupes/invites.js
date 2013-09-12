/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService     = require("../../services/troupe-service");
var restSerializer    = require("../../serializers/rest-serializer");
var collections       = require("../../utils/collections");
var Q                 = require("q");

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

      var promises = invites.map(function(invite) {
        return troupeService.createInvite(req.troupe, {
            fromUser: req.user,
            email: invite.email,
            displayName: invite.displayName,
            userId: invite.userId
          });
      });

      Q.all(promises).then(function(results) {

        var invites = results.filter(function(i) { return !i.ignored; });

        var strategy = new restSerializer.InviteStrategy({ currentUserId: req.user.id });
        restSerializer.serialize(invites, strategy, function(err, serialized) {
          if(err) return next(err);
          var indexedSerialized = collections.indexById(serialized);

          res.send(results.map(function(invite) {
            if(invite.ignored) return invite;
            return indexedSerialized[invite.id];
          }));

        });

      }, next);

    },

    destroy: function(req, res, next) {
      req.invite.remove(function() {
        res.send({ success: true });
      });
    },

    load: function(id, callback){
      troupeService.findInviteById(id, callback);
    }

};
