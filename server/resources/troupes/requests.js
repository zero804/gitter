/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var troupeService = require("../../services/troupe-service"),
    restSerializer = require("../../serializers/rest-serializer");

function serialize(items, req, res, next) {

  var strategy = new restSerializer.RequestStrategy({ currentUserId: req.user.id, troupeId: req.troupe.id });
  restSerializer.serialize(items, strategy, function(err, serialized) {
    if(err) return next(err);

    res.send(serialized);
  });


}
module.exports = {
    index: function(req, res, next){
      troupeService.findAllOutstandingRequestsForTroupe(req.troupe.id, function(err, requests) {
        if(err) return next(err);

        serialize(requests, req, res, next);
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
        serialize(req.request, req, res, next);
      });
    },

    destroy: function(req, res, next) {
      troupeService.rejectRequest(req.request, function(err) {
        if(err) return next(err);
        res.send({ success: true });
      });
    },

    load: function(req, id, callback){
      troupeService.findPendingRequestForTroupe(req.troupe.id, id, callback);
    }

};
