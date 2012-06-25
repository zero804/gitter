/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require('../services/troupe-service'),
    fileService = require('../services/file-service'),
    winston = require('winston');

var mimeIcons = {
  'image/jpeg': '/images/mime/jpg.png',
  'image/png': '/images/mime/png.png',
  'image/gif': '/images/mime/gif.png',
  'application/octet-stream': '/images/2/mime/unknown.png',
  'application/msword': '/images/2/mime/doc.png'
};

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
      var fileName = '' + req.params.thumbnail + (req.params.format ? '.' + req.params.format : '');
      fileService.getThumbnailStream(req.troupe.id, fileName, 0, function(err, mimeType, stream) {
        if(err || !stream) {
          var redirectImage = mimeIcons[mimeType];
          if(redirectImage) {
            return res.relativeRedirect(redirectImage);
          }

          return res.relativeRedirect("/images/2/mime/unknown.png");
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
