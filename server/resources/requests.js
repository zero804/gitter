/*jshint globalstrict:true, trailing:false unused:true node:true*/
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
    restSerializer = require("../serializers/rest-serializer");

module.exports = {
    index: function(req, res, next){
      troupeService.findAllOutstandingRequestsForTroupe(req.troupe.id, function(err, requests) {
        if(err) return next(err);

        var strategy = new restSerializer.RequestStrategy({ currentUserId: req.user.id, troupeId: req.troupe.id });
        restSerializer.serialize(requests, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });

      });
    },

    "new": function(req, res){
      res.send(500);
    },

    create: function(req, res) {
      res.send(500);
    },

    show: function(req, res){
      res.send(500);
    },

    edit: function(req, res){
      res.send(500);
    },

    /* This means the user has been accepted */
    update:  function(req, res, next) {
      troupeService.acceptRequest(req.request, function(err) {
        if(err) return next(err);
        res.send(200);
      });
    },

    destroy: function(req, res, next) {
      troupeService.rejectRequest(req.request, function(err) {
        if(err) return next(err);
        res.send(200);
      });
    },

    load: function(req, id, callback){
      troupeService.findPendingRequestForTroupe(req.troupe.id, id, callback);
    }

};
