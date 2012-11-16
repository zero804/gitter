/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require('../services/troupe-service'),
    fileService = require('../services/file-service'),
    winston = require('winston');

module.exports = {
    index: function(req, res, next) {
      res.relativeRedirect("/troupes/" + req.troupe.id + "/files/");
    },

    new: function(req, res) {
      res.send(500);
    },

    create: function(req, res) {
      res.send(500);
    },

    show: function(req, res) {
      var fileName = '' + req.params.embedded + (req.params.format ? '.' + req.params.format : '');
      winston.info('Serving ' + fileName);
      fileService.getFileEmbeddedStream(req.troupe.id, fileName, 0, function(err, mimeType, stream) {
        if(err || !stream) {
          res.contentType("text/html");

          if (err) return res.send(500);
          return res.send(404);
        }

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
