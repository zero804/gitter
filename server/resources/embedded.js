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

    show: function(req, res, next) {
      var fileName = '' + req.params.embedded + (req.params.format ? '.' + req.params.format : '');

      var presentedEtag = req.get('If-None-Match');

      fileService.getFileEmbeddedStream(req.troupe.id, fileName, 0, presentedEtag, function(err, mimeType, etagMatches, etag, stream) {
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

        stream.pipe(res);
      });

    }

};
