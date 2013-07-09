/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require("../../services/troupe-service"),
    restSerializer = require("../../serializers/rest-serializer");
var winston = require('winston');

module.exports = {

    index: function(req, res, next) {
      troupeService.findAllUnusedInvitesForUserId(req.user.id, function(err, invites) {
        if(err) return next(err);

        var strategy = new restSerializer.InviteStrategy({});

        restSerializer.serialize(invites, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });

      });
    },

    update:  function(req, res){
      // accept invite
      troupeService.acceptInviteForAuthenticatedUser(req.user, req.invite)
        .then(function() {
          res.send({ success: true });
        })
        .fail(function(err){
          winston.error('Unable to accept invite: ', { exception: err });
          res.send(400);
        });
    },

    destroy: function(req, res) {
      // reject invite
      troupeService.rejectInviteForAuthenticatedUser(req.user, req.invite)
        .then(function() {
          res.send({ success: true });
        })
        .fail(function(err){
          winston.error('Unable to reject invite: ', { exception: err });

          res.send(400);
        });
    },

    load: function(id, callback) {
      troupeService.findInviteById(id, callback);
    }

};
