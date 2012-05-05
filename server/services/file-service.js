/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var persistence = require("./persistence-service");
var mongoose = require("mongoose");

function createFileName(fileId, version) {
  return "attachment:" + fileId + ":" + version;
}


function findById(id, callback) {
  persistence.File.findOne({_id:id} , function(err, file) {
    callback(err, file);
  });
}

function uploadFileToGrid(fileId, version, file, temporaryFile, callback) {
  console.dir(["uploadFileToGrid", arguments]);

  var db = mongoose.connection.db;
  var GridStore = mongoose.mongo.GridStore;
  var gridFileName = createFileName(fileId, 1);
  var gs = new GridStore(db, gridFileName, "w", {
      "content_type": file.mimeType,
      "metadata":{
        /* Attributes go here */
        usage: "attachment",
        troupeId: file.troupeId,
        fileName: file.fileName
      }
  });

  gs.writeFile(temporaryFile, function(err) {
    if (err) return callback(err);
    return callback(err, file);
  });
}

function getFileStream(troupeId, fileName, version, callback) {
  
  findByFileName(troupeId, fileName, function(err, file) {
    if (err) return callback(err)
    if (!file) return callback(null, null);

    if(version == 0) {
      version = file.versions.length;
    }

    var db = mongoose.connection.db;
    var GridStore = mongoose.mongo.GridStore;
    var gridFileName = createFileName(file.id, 1);

    var gs = new GridStore(db, gridFileName, 'r');
    gs.open(function(err, gs) {
      if(err) return callback(err);
      if(!gs) return callback(null, null);

      var readStream = gs.stream(true);
      
      callback(null, file.mimeType, readStream);
      
    });
  });
}

function findByTroupe(id, callback) {
  persistence.File.find({troupeId: id}, function(err, files) {
      callback(err, files);
    });
}

function findByFileName(troupeId, fileName, callback) {
  persistence.File.findOne({ troupeId: troupeId, fileName: fileName}, callback);
}

function storeFile(options, callback) {
  var troupeId = options.troupeId;
  var creatorUserId = options.creatorUserId;
  var fileName = options.fileName;
  var mimeType = options.mimeType;
  var temporaryFile = options.file;
  var version, file;

  findByFileName(troupeId, fileName, function(err, file) {
    if(err) return callback(err);

    if(!file) {
      /* File doesn't exist, create it first */
      file = new persistence.File();
      file.troupeId = troupeId;
      file.fileName = fileName;
      file.mimeType = mimeType;

      version = new persistence.FileVersion();
      version.creatorUserId = creatorUserId; 
      version.createdDate = Date.now;
      version.source = null; //TODO: add source

      file.versions = [version];

      file.save(function(err) {
          if (err) return callback(err);

          uploadFileToGrid(file.Id, 1, file, temporaryFile, callback);
        });

      return;
    }

    /* Create a new version and push it onto the array of version */
    version = new persistence.FileVersion();
    version.creatorUserId = creatorUserId; 
    version.createdDate = Date.now;
    version.source = null; //TODO: add source

    /* File exists, add a version */
    file.versions.push(version);
    file.save(function(err) {
        if (err) return callback(err);
        uploadFileToGrid(file.id, file.versions.length, file, temporaryFile, callback);
      });
  });
}

module.exports = {
  findByTroupe: findByTroupe,
  findById: findById,
  findByFileName: findByFileName,
  storeFile: storeFile,
  getFileStream: getFileStream
};