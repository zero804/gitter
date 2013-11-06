/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var inviteService = require("../../services/invite-service");
var troupeService = require("../../services/troupe-service");
var restSerializer = require("../../serializers/rest-serializer");
var winston = require('winston');

module.exports = {

    index: function(req, res, next) {
      inviteService.findAllUnusedInvitesForUserId(req.user.id, function(err, invites) {
        if(err) return next(err);

        var strategy = new restSerializer.InviteStrategy({});

        restSerializer.serialize(invites, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });

      });
    },

    show: function(req, res, next) {
      var strategy = new restSerializer.InviteStrategy({});

      restSerializer.serialize(req.invite, strategy, function(err, serialized) {
        if(err) return next(err);

        res.send(serialized);
      });

    },

    update:  function(req, res){
      // accept invite
      inviteService.acceptInviteForAuthenticatedUser(req.user, req.invite)
        .then(function(troupe) {
          return troupeService.getUrlForTroupeForUserId(troupe, req.user.id)
            .then(function(url) {
              res.send({ success: true, troupeUrl: url, troupeId: troupe.id });
            });
        })
        .fail(function(err){
          winston.error('Unable to accept invite: ', { exception: err });
          res.send(400);
        });
    },

    destroy: function(req, res) {
      // reject invite
      inviteService.rejectInviteForAuthenticatedUser(req.user, req.invite)
        .then(function() {
          res.send({ success: true });
        })
        .fail(function(err){
          winston.error('Unable to reject invite: ', { exception: err });

          res.send(400);
        });
    },

    load: function(req, id, callback) {
      inviteService.findInviteForUserById(req.user.id, id, callback);
    }

};
