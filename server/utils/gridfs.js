/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global console:false, require: true, module: true */
"use strict";

var mongoose = require("mongoose");
var winston = require("winston");
var fs = require("fs");

/* private */
function uploadFile(options, callback) {
  var fileName = options.fileName;
  var localFileName = options.localFileName;
  var mimeType = options.mimeType;
  var metadata = options.metadata;

  winston.info('Uploading file to grid: ' + fileName);

  var db = mongoose.connection.db;
  var GridStore = mongoose.mongo.GridStore;
  var gs = new GridStore(db, fileName, "w", {
      "content_type": mimeType,
      "metadata": metadata
  });

  gs.writeFile(localFileName, function(err) {
    if (err) return callback(err);

    return callback();
  });
}

function downloadFile(options, callback) {
  winston.info('Uploading file to grid: ' + options.fileName);

  var fileName = options.fileName;
  var localFileName = options.localFileName;


  (new mongoose.mongo.GridStore(mongoose.connection.db, fileName, "r")).open(onOpen);

  function onOpen(e, gs) {
    throws (e, callback, "Couldn't open grid file");

    gs.read(gs.length, onRead);
  }

  function onRead(e, data) {
    throws (e, callback, "Couldn't read grid file");

    fs.writeFile(localFileName, data, callback);
  }

}

function throws (e, f, m) {
  if (e) {
    if (m) {
      winston.error(m, e);
    }

    if (f)
      return f(e);
    else
      throw e;
  }
}

module.exports = {
  uploadFile: uploadFile,
  downloadFile: downloadFile
};