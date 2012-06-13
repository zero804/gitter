/*jshint globalstrict:true, trailing:false */
/*global require: true, module: true */
"use strict";

var persistence = require("./persistence-service");
var mongoose = require("mongoose");
var mime = require("mime");
var winston = require("winston");
var appEvents = require("../app-events");
var console = require("console");
var Q = require("q");
var crypto = require('crypto');
var fs = require('fs');
var http = require('http'),
    path = require('path'),
    temp = require("temp");

var mimeTypesWithNoConversionRequired = [
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/vnd.adobe.photoshop"
];

function generatePdfFile(options, callback) {
  var fileName = options.fileName;
  var mimeType = options.mimeType;

  if(mimeTypesWithNoConversionRequired.indexOf(mimeType) >= 0) {
    return callback(null, {
      conversionNotRequired: true
    });
  }
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

    var tempName = temp.path({prefix: 'embedded', suffix: '.pdf'});
    winston.info("Embedded version at " + tempName);

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

function generateEmbeddedFile(options, callback) {
  return generatePdfFile(options, callback);
}

module.exports = {
  generateEmbeddedFile: generateEmbeddedFile
};