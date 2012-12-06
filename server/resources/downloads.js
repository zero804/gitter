/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require('../services/troupe-service'),
    fileService = require('../services/file-service'),
    mongoose = require("mongoose"),
    fs = require("fs"),
    winston = require('winston');

module.exports = {
    index: function(req, res, next) {
      res.relativeRedirect("/troupes/" + req.troupe.id + "/files/");
    },

    create: function(req, res, next) {
      winston.info("New file upload started..... ");
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

    show: function(req, res, next) {
      var fileName = '' + req.params.download + (req.params.format ? '.' + req.params.format : '');

      var presentedEtag = req.get('If-None-Match');

      fileService.getFileStream(req.troupe.id, fileName, 0, presentedEtag, function(err, mimeType, etagMatches, etag, stream) {
        if(err) return next(err);

        if(!stream && !etagMatches) {
          return res.send(404);
        }

        res.setHeader("Cache-Control","private");
        res.setHeader('ETag', etag);
        res.setHeader('Vary', 'Accept');
        res.setHeader('Expires', new Date(Date.now() + 365 * 86400 * 1000));
        res.contentType(mimeType);

        if(etagMatches) {
          return res.send(304);
        }

        if(!req.query["embedded"]) {
          res.header("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
        }
        stream.pipe(res);
      });

    }

};
