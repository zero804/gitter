/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var notificationService = require("../../services/notification-service");

module.exports = {
    index: function(req, res, next) {
      notificationService.findByTroupe(req.troupe.id, {}, function(err, notifications) {
        if (err) return next(err);

        res.send(notifications);
      });
    },

    "new": function(req, res){
      res.send(500);
    },

    create: function(req, res) {
      res.send(500);
    },

    show: function(req, res){
      res.send(req.file);
    },

    edit: function(req, res){
      res.send(500);
    },

    update:  function(req, res){
      res.send(500);
    },

    destroy: function(req, res){
      res.send(500);
    },

    load: function(id, callback) {
      throw new Error("Not yet supported");
    }

};
