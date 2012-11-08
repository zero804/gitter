/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require('../services/troupe-service'),
    fileService = require('../services/file-service'),
    mongoose = require("mongoose"),
    fs = require("fs"),
    winston = require('../utils/winston');

module.exports = {
    index: function(req, res, next) {
      res.relativeRedirect("/troupes/" + req.troupe.id + "/files/");
    },

    "new": function(req, res) {
      res.send(500);
    },

    create: function(req, res, next) {
      winston.log("New file upload started..... ");
      /* File was uploaded through HTTP Form Upload */
      var files = req.files;
      for(var k in files) {
        if(files.hasOwnProperty(k)) {
          var file = files[k];

          fileService.storeFile({
            troupeId: req.troupe.id,
            creatorUserId: req.user.id,
            fileName: file.name,
            mimeType: file.type,
            file: file.path
          }, function(err, fileAndVersion) {
            if(err) return next(err);

            /* The AJAX file upload component we use requires an object shaped like this (below) */
            res.send({ success: true });
          });
        }
      }
    },

    show: function(req, res) {
      var fileName = '' + req.params.download + (req.params.format ? '.' + req.params.format : '');
      fileService.getFileStream(req.troupe.id, fileName, 0, function(err, mimeType, stream) {
        if(err || !stream) {
          res.contentType("text/html");

          if (err) return res.send(500);
          return res.send(404);
        }

        res.contentType(mimeType);
        if(!req.query["embedded"]) {
          res.header("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
        }

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
