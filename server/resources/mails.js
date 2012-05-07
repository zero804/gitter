/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
    mailService = require("../services/mail-service");

module.exports = {
    index: function(req, res, next) {
      mailService.findByTroupe(req.troupe.id, function(err, mails) {
        if(err) return next(err);
        res.send(mails.narrow());
      });
    },

    new: function(req, res){
      res.send(500);
    },

    create: function(req, res) {
      res.send(500);
    },

    show: function(req, res){
      var m = req.mail;
      res.send(req.mail);
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
      mailService.findById(id,callback);
    }

};
