/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var inviteService = require("../../services/invite-service");
var restSerializer = require("../../serializers/rest-serializer");
var winston = require('winston');

module.exports = {
    // Outgoing connection invites.
    index: function(req, res, next) {
      inviteService.findAllUnusedConnectionInvitesFromUserId(req.user.id, function(err, invites) {
        if(err) return next(err);

        var strategy = new restSerializer.InviteStrategy({});

        restSerializer.serialize(invites, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });

      });
    },

    destroy: function(req, res, next) {
      // Delete an invite created by this user
      req.connectioninvite.remove(function(err) {
        if(err) {
          winston.error("Unable to remove connection invite", { exception: err });
          return next(err);
        }

        res.send({ success: true });
      });
    },

    load: function(req, id, callback) {
      inviteService.findInviteForUserById(req.user.id, id, callback);
    }

};
