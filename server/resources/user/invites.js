/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require("../../services/troupe-service"),
    restSerializer = require("../../serializers/rest-serializer"),
    Fiber = require("../../utils/fiber");

module.exports = {

    index: function(req, res, next) {
      troupeService.findAllUnusedInvitesForEmail(req.user.email, function(err, invites) {
        if(err) return next(err);

        var strategy = new restSerializer.InviteStrategy({});

        restSerializer.serialize(invites, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });

      });
    },

    "new": function(req, res){
      res.send('new invites');
    },

    create: function(req, res, next) {
      res.send();
    },

    show: function(req, res){
      res.send(req.share);
    },

    edit: function(req, res){
      res.send('edit forum ' + req.share.title);
    },

    update:  function(req, res){
      // accept invite here troupeService.acceptInviteForAuthenticatedUser
      res.send('update forum ' + req.share.title);
    },

    destroy: function(req, res) {
      // troupeService.rejectInvite(req.share.id);
      res.send(200);
    },

    load: function(id, callback) {
      troupeService.findInviteById(id, callback);
    }

};
