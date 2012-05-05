/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require('../services/troupe-service'),
    fileService = require('../services/file-service'),
    mongoose = require("mongoose");

module.exports = {
    index: function(req, res, next) {
      res.relativeRedirect("/troupes" + req.troupe.id + "/files/");
    },

    new: function(req, res) {
      res.send(500);
    },

    create: function(req, res) {
      var files = req.files;
      for(var k in req.files) {
        if(files.hasOwnProperty(k)) {
          var file = files[k];

          fileService.storeFile({
            troupeId: req.troupe.id,
            creatorUserId: req.user.id,
            fileName: file.name,
            mimeType: file.type,
            file: file.path
          }, function(err, file) {
            if(err) return response.send(500);

            res.relativeRedirect("/troupes" + req.troupe.id + "/files/" + file.id);
          });
        }
      }
    },

    show: function(req, res) {
      var fileName = '' + req.params.download + (req.params.format ? '.' + req.params.format : '');

      fileService.getFileStream(req.troupe.id, fileName, 0, function(err, mimeType, stream) {
        if (err) return res.send(500);
        if (!stream) return res.send(404);

        res.contentType(mimeType);

        stream.pipe(res);
      });

    },

    edit: function(req, res) {
      res.send(500);
    },

    update: function(req, res) {
      res.send(500);
    },

    destroy: function(req, res) {
      res.send(500);
    }

};
