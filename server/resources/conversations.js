/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
    conversationService = require("../services/conversation-service"),
    fileService = require("../services/file-service"),
    restSerializer = require("../serializers/rest-serializer"),
    winston = require('winston');

function compose(m, attachments) {
  return {
    fromName: m.fromName,
    date: m.date,
    subject: m.subject,
    troupeId: m.troupeId,
    from: m.from,
    id: m.id,
    mail: m.mail,
    attachments: attachments
  };
}

module.exports = {
    index: function(req, res, next) {
      conversationService.findByTroupe(req.troupe.id, function(err, conversations) {
        if(err) return next(err);

        restSerializer.serialize(conversations, restSerializer.ConversationMinStrategy, function(err, serialized) {
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

      restSerializer.serialize(m, restSerializer.ConversationStrategy, function(err, serialized) {
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
