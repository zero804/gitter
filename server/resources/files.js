/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
    fileService = require("../services/file-service"),
    winston = require("winston"),
    restSerializer = require("../serializers/rest-serializer");


module.exports = {
    index: function(req, res, next) {
      fileService.findByTroupe(req.troupe.id, function(err, files) {
        if (err) {
          console.log("Error in findByTroupe: " + err);
          return next(err);
        }

        var strategy = new restSerializer.FileStrategy({ currentUserId: req.user.id, troupeId: req.troupe.id });
        restSerializer.serialize(files, strategy, function(err, serializedFiles) {
          if (err) {
            console.log("Error in Serializer:" + err);
            return next(err);
          }
          res.send(serializedFiles);
        });
      });
    },

    'new': function(req, res){
      res.send(500);
    },

    create: function(req, res) {
      res.send(500);
    },

    show: function(req, res, next) {
      restSerializer.serialize(req.file, new restSerializer.FileStrategy(), function(err, serializedFile) {
        if (err) {
          console.log("Error in Serializer:" + err);
          return next(err);
        }

        res.send(serializedFile);
      });
    },

    edit: function(req, res){
      res.send(500);
    },

    update:  function(req, res){
      res.send(500);
    },

    destroy: function(req, res){
      // TODO(AN): delete from GridFS
      console.log("file: ", req.file);
      req.file.remove(function(err) {
        if(err) {
          winston.error("Unable to remove file", err);
          res.send(500);
          return;
        }

        res.send({ success: true });
      });
    },

    load: function(id, callback) {
      fileService.findById(id, callback);
    }

};
