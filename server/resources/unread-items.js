/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var unreadItemService = require("../services/unread-item-service");

module.exports = {
    index: function(req, res, next) {
      var userId = req.user.id;
      var troupe = req.troupe.id;

      unreadItemService.getUnreadItemsForUser(userId, req.troupe.id, function(err, data) {
        if(err) return next(err);

        res.send(data);
      });
    },

    'new': function(req, res){
      res.send(500);
    },

    create: function(req, res, next) {
      var unreadItems = req.body;
      unreadItemService.markItemsRead(req.user.id, req.troupe.id, unreadItems, function(err) {
        if(err) return next(err);

        res.send(200);

      });
    },

    show: function(req, res){
      res.send(500);
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
      callback("Not supported");
    }

};
