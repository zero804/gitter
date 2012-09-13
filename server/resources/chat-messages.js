/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var chatService = require("../services/chat-service"),
    c = require("../utils/collections"),
    userService = require("../services/user-service"),
    _ = require("underscore"),
    restSerializer = require("../serializers/rest-serializer");

var predicates = c.predicates;


module.exports = {
    index: function(req, res, next) {
      var skip = req.query.skip;
      var limit = req.query.limit;

      var options = {
          skip: skip ? skip : 0,
          limit: limit ? limit: 50
      };

      chatService.findChatMessagesForTroupe(req.troupe.id, options, function(err, chatMessages) {
        if(err) return next(err);

        restSerializer.serialize(chatMessages, new restSerializer.ChatStrategy( { currentUserId: req.user.id } ), function(err, serialized) {
          if(err) return next(err);
          res.send(serialized);
        });
      });
    },

    'new': function(req, res){
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

    update:  function(req, res){
      res.send(500);
    },

    destroy: function(req, res){
      res.send(500);
    },

    load: function(id, callback) {
      chatService.findById(id, callback);
    }

};
