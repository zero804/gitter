/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var fileService = require('../../services/file-service');

var mimeIcons = {
  'image/jpeg': '/images/mime/jpg.png',
  'image/png': '/images/mime/png.png',
  'image/gif': '/images/mime/gif.png',
  'application/octet-stream': '/images/2/mime/unknown.png',
  'application/msword': '/images/2/mime/doc.png'
};

function getDefaultImage(mimeType) {
    var result = mimeIcons[mimeType];
    if(result) return result;
    return "/images/2/mime/unknown.png";
}

module.exports = {
    index: function(req, res) {
      res.relativeRedirect("/troupes/" + req.troupe.id + "/files/");
    },

    show: function(req, res) {
      var fileName = '' + req.params.thumbnail + (req.params.format ? '.' + req.params.format : '');

      var presentedEtag = req.get('If-None-Match');

      fileService.getThumbnailStream(req.troupe.id, fileName, 0, presentedEtag, function(err, mimeType, etagMatches, etag, stream) {
        if(err || (!stream && !etagMatches)) {
          var redirectImage = getDefaultImage(mimeType);
          return res.relativeRedirect(301, redirectImage);
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
