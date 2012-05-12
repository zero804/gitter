var express = require('express');
/* Patched version of formidable that can handle octet-streams */
/* See https://github.com/scriby/node-formidable */
var formidable = require('../../patched-modules/node-formidable');

module.exports = {
  install: function() {
    express.bodyParser.parse['application/octet-stream'] = function(req, options, fn) {
      var form = new formidable.IncomingForm();
      form.parse(req, function(err, fields, files) {
        if(err) return fn(err);

        if(files && files.file && files.file.name) {
          files.file.name = decodeURIComponent(files.file.name);
        }

        console.dir(["XXX", files]);

        req.files = files;
        fn();
      });
    }
  }
}
