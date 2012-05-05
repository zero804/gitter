/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
    fileService = require("../services/file-service");

module.exports = {
    index: function(req, res, next) {
      fileService.findByTroupe(req.troupe.id, function(err, files) {
        if (err) return next(err);

        res.send(files.narrow());
      });
    },

    new: function(req, res){
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
      fileService.findById(id, callback);
    }

};
