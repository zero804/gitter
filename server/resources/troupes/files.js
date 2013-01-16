/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var fileService = require("../../services/file-service"),
    winston = require("winston"),
    restSerializer = require("../../serializers/rest-serializer");


module.exports = {
    index: function(req, res, next) {
      fileService.findByTroupe(req.troupe.id, function(err, files) {
        if (err) {
          winston.error("Error in findByTroupe: ", { exception: err });
          return next(err);
        }

        var strategy = new restSerializer.FileStrategy({ currentUserId: req.user.id, troupeId: req.troupe.id });
        restSerializer.serialize(files, strategy, function(err, serializedFiles) {
          if (err) {
            winston.error("Error in Serializer:", { exception: err });
            return next(err);
          }
          res.send(serializedFiles);
        });
      });
    },

    show: function(req, res, next) {
      restSerializer.serialize(req.file, new restSerializer.FileStrategy(), function(err, serializedFile) {
        if (err) {
          winston.error("Error in Serializer:", { exception: err });
          return next(err);
        }

        res.send(serializedFile);
      });
    },

    destroy: function(req, res, next){
      // TODO(AN): delete from GridFS
      req.file.remove(function(err) {
        if(err) {
          winston.error("Unable to remove file", { exception: err });
          return next(err);
        }

        res.send({ success: true });
      });
    },

    load: function(id, callback) {
      fileService.findById(id, callback);
    }

};
