/*jshint globalstrict:true, trailing:false unused:true node:true*/
/*global require: true, module: true */
"use strict";

var winston = require("winston");
var fs = require('fs');
var http = require('http'),
    temp = require("temp");

function convert(options, callback) {
  var fileName = options.fileName;
  var mimeType = options.mimeType;

  var req = http.request({
    port: 9021,
    path: '/createpdf',
    headers: {
      "content-type": mimeType
    },
    method: 'POST'
  }, function(res) {
    if(res.statusCode != 200) {
      res.destroy();
      return callback("Converter service returned an invalid response: " + res.statusCode);
    }

    var tempName = temp.path({prefix: 'converter', suffix: '.pdf'});
    winston.info("Converted pdf version at " + tempName);

    var fileStream = fs.createWriteStream(tempName);
    var mimeType = res.headers['content-type'];
    res.on('close', function() {
      callback("HTTP connection closed.");
    });

    res.on('end', function() {
      callback(null, {
        fileName: tempName,
        mimeType: mimeType
      });
    });

    res.pipe(fileStream);
  });

  req.on('error', function(e) {
    callback(e);
  });

  var stream = fs.createReadStream(fileName);
  stream.pipe(req);
}

module.exports = {
  convert: convert
};