/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var persistence = require("./persistence-service");
var mongoose = require("mongoose");
var mime = require("mime");
var winston = require("winston");
var appEvents = require("../app-events");

/* private */
function createFileName(fileId, version) {
  return "attachment:" + fileId + ":" + version;
}

/* public */
function findById(id, callback) {
  persistence.File.findOne({_id:id} , function(err, file) {
    callback(err, file);
  });
}

/* private */
function uploadFileToGrid(file, version, temporaryFile, callback) {
  var db = mongoose.connection.db;
  var GridStore = mongoose.mongo.GridStore;
  var gridFileName = createFileName(file.id, version);
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

    if(file.versions.length === 0) {
      console.dir(file);
      return callback(null, null, null);
    }

    if(version == 0) {
      version = file.versions.length;
    }


    var db = mongoose.connection.db;
    var GridStore = mongoose.mongo.GridStore;
    var gridFileName = createFileName(file.id, version);

    GridStore.exist(db, gridFileName, function(err, result) {
      if(!result) {
        winston.warn("File " + gridFileName + " does not exist.");
        return callback(null, null);
      }

      var gs = new GridStore(db, gridFileName, 'r');
      gs.open(function(err, gs) {
        if(err) return callback(err);
        if(!gs) return callback(null, null);

        var readStream = gs.stream(true);        
        callback(null, file.mimeType, readStream);
        
      });

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

/**
 * Store a file and return a callback referencing the file and the version
 */
/* public */
function storeFile(options, callback) {
  var troupeId = options.troupeId;
  var creatorUserId = options.creatorUserId;
  var fileName = options.fileName;
  var mimeType = options.mimeType;
  var temporaryFile = options.file;
  var version, file;

  /* Try figure out a better mimeType for the file */
  if(mimeType === "application/octet-stream") {
    var guessedMimeType = mime.lookup(fileName);
    if(guessedMimeType) mimeType = guessedMimeType;
  }

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

          uploadFileToGrid(file, 1, temporaryFile, function(err, file) {
            if(!err) {
              appEvents.fileEvent('create', troupeId, file.id);
            }

            callback(err, {
              file: file,
              version: 1
            });
          });
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
        uploadFileToGrid(file, file.versions.length, temporaryFile, function(err, file) {
          if(!err) {
            appEvents.fileEvent('createVersion', troupeId, file.id);
          }
          
          callback(err, {
            file: file,
            version: file.versions.length
          });
        });
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