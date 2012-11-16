/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var mongoose = require("mongoose");
var winston = require("winston");

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

module.exports = {
  uploadFile: uploadFile
};