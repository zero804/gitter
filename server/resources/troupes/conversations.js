/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var conversationService = require("../../services/conversation-service"),
    restSerializer = require("../../serializers/rest-serializer");

module.exports = {
    index: function(req, res, next) {
      conversationService.findByTroupe(req.troupe.id, function(err, conversations) {
        if(err) return next(err);

        restSerializer.serialize(conversations, new restSerializer.ConversationMinStrategy(), function(err, serialized) {
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

    show: function(req, res, next){
      var m = req.conversation;

      restSerializer.serialize(m, new restSerializer.ConversationStrategy(), function(err, serialized) {
        if(err) return next(err);
        res.send(serialized);
      });

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

    load: function(id, callback){
      conversationService.findById(id,callback);
    }

};
