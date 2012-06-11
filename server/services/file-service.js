/*jshint globalstrict:true, trailing:false */
/*global require: true, module: true */
"use strict";

var persistence = require("./persistence-service");
var embeddedFileService = require("./embedded-file-service");
var mongoose = require("mongoose");
var mime = require("mime");
var winston = require("winston");
var appEvents = require("../app-events");
var console = require("console");
var Q = require("q");
var crypto = require('crypto');
var fs = require('fs'),
    im = require('imagemagick');

/* private */
function createFileName(fileId, version) {
  return "attachment:" + fileId + ":" + version;
}

function createEmbeddedFileName(fileId, version) {
  return "embedded:" + fileId + ":" + version;
}
function createThumbNailFileName(fileId, version) {
  return "thumb:" + fileId + ":" + version;
}
/* public */
function findById(id, callback) {
  persistence.File.findOne({_id:id} , function(err, file) {
    callback(err, file);
  });
}

/* private */
function uploadFileToGrid(file, version, temporaryFile, callback) {
  winston.info('Uploading file to grid: ' + file.fileName + "(" + version + ")");

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

function calculateMd5ForFile(temporaryFile, callback) {
  var md5sum = crypto.createHash('md5');
  var s = fs.ReadStream(temporaryFile);

  s.on('data', function(d) {
    md5sum.update(d);
  });

  s.on('end', function() {
    var d = md5sum.digest('hex');
    callback(null, d);
  });
}

/* private */
function compareHashSums(gridFileName, temporaryFile, callback) {
  var db = mongoose.connection.db;
  var GridStore = mongoose.mongo.GridStore;

  var gsOp = Q.defer();
  var fsOp = Q.defer();

  var gs = new GridStore(db, gridFileName, "r");
  gs.open(function(err, gridStore) {
    if (err) return gsOp.reject(new Error(err));

    gsOp.resolve(gs.md5);

    gs.close(function(err) {});
  });

  calculateMd5ForFile(temporaryFile, fsOp.node());

  Q.all([gsOp.promise, fsOp.promise]).spread(function(gsMd5, fsMd5) {
    callback(null, gsMd5 === fsMd5);
  }).fail(function(err) {
    return callback(err);
  });

}

/* private */
function checkIfFileExistsAndIdentical(file, version, temporaryFile, callback) {
  var db = mongoose.connection.db;
  var GridStore = mongoose.mongo.GridStore;
  var gridFileName = createFileName(file.id, version);

  var join = Q.defer();

  GridStore.exist(db, gridFileName, function(err, result) {
    if (err) return callback(err);

    if(!result) return callback(null, false);

    compareHashSums(gridFileName, temporaryFile, callback);
  });
}

function locateAndStream(troupeId, fileName, version, gridFileNamingStrategy, callback) {
  findByFileName(troupeId, fileName, function(err, file) {
    if (err) return callback(err);
    if (!file) return callback(null, null);

    if(file.versions.length === 0) {
      return callback(null, null, null);
    }

    if(!version) {
      version = file.versions.length;
    }

    var db = mongoose.connection.db;
    var GridStore = mongoose.mongo.GridStore;
    var gridFileName = gridFileNamingStrategy(file.id, version);

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
        callback(null, gs.contentType, readStream);
      });

    });

  });

}

function getFileEmbeddedStream(troupeId, fileName, version, callback) {
  locateAndStream(troupeId, fileName, version, function(fileId, version) { return createEmbeddedFileName(fileId, version); }, callback);
}

function getThumbnailStream(troupeId, fileName, version, callback) {
  locateAndStream(troupeId, fileName, version, function(fileId, version) { return createThumbNailFileName(fileId, version); }, callback);
}

function getFileStream(troupeId, fileName, version, callback) {
  locateAndStream(troupeId, fileName, version, function(fileId, version) { return createFileName(fileId, version); }, callback);
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
function storeFileVersionInGrid(options, callback) {
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

          uploadFileToGrid(file, 1, temporaryFile, function(err, file) {
            if(!err) {
              appEvents.fileEvent('create', troupeId, file.id);
            }

            callback(err, {
              file: file,
              version: 1,
              alreadyExists: false
            });
          });
        });

      return;
    }

    checkIfFileExistsAndIdentical(file, file.versions.length, temporaryFile, function(err, existsAndIdentical) {
      if(err) return callback(err);

      if(existsAndIdentical) {
        winston.info("File already exists and is identical to the latest version.");
        return callback(null, {
          file: file,
          version: file.versions.length,
          alreadyExists: true
        });
      }

      /* Create a new version and push it onto the array of version */
      version = new persistence.FileVersion();
      version.creatorUserId = creatorUserId; 
      version.createdDate = Date.now;
      version.source = null; //TODO: add source 
      file.versions.push(version);

      /* File exists, add a version */
      file.save(function(err) {
        if (err) return callback(err);
        uploadFileToGrid(file, file.versions.length, temporaryFile, function(err, file) {
          if(!err) {
            appEvents.fileEvent('createVersion', troupeId, file.id);
          }
          callback(err, {
            file: file,
            version: file.versions.length,
            alreadyExists: false
          });
        });
      });
    });
  });
}

function generateAndPersistThumbnailForFile(fileName, originalFileName, troupeId, fileId, version) {
  var resizedPath = fileName + "-small.jpg";
  winston.info("Converting " + fileName + " to thumbnail");
  im.convert(['-define','jpeg:size=48x48',fileName + "[0]",'-thumbnail','48x48^','-gravity','center','-extent','48x48',resizedPath], 
    function(err, stdout, stderr) {
      if (err) return winston.error(err);

      var db = mongoose.connection.db;
      var GridStore = mongoose.mongo.GridStore;
      var gridFileName = createThumbNailFileName(fileId, version);
      var gs = new GridStore(db, gridFileName, "w", {
          "content_type": "image/jpeg",
          "metadata":{
            /* Attributes go here */
            usage: "thumbnail",
            troupeId: troupeId,
            fileName: originalFileName,
            version: version
          }
      });

      gs.writeFile(resizedPath, function(err) {
        if (err) return winston.error(err);
        winston.info("Successfully persisted " + resizedPath + " as " + gridFileName);
      });
    });
}

function generateEmbeddedVersionOfFile(options, callback) {
  embeddedFileService.generateEmbeddedFile({
    fileName: options.file,
    mimeType: options.mimeType
  }, callback);
}

function storeFile(options, callback) {
  var fileName = options.fileName;
  var mimeType = options.mimeType;
  var temporaryFile = options.file;
  var troupeId = options.troupeId;

  /* Need to correct the mimeType from time to time */
  /* Try figure out a better mimeType for the file */
  if(!mimeType || mimeType === "application/octet-stream") {
    var guessedMimeType = mime.lookup(fileName);
    winston.info("Guessed mime type of " + fileName + " to be " + guessedMimeType);
    if(guessedMimeType) {
      mimeType = guessedMimeType;
      options.mimeType = mimeType;
    }
  }

  storeFileVersionInGrid(options, function(err, fileAndVersion) {
    if(err) return callback(err);
    if(fileAndVersion.alreadyExists) return callback(err, fileAndVersion);

    generateEmbeddedVersionOfFile(options, function(err, embeddedFileInfo) {
      if(err) return winston.error(err);

      var fileForThumb = embeddedFileInfo.conversionNotRequired ? temporaryFile : embeddedFileInfo.fileName;

      generateAndPersistThumbnailForFile(fileForThumb, temporaryFile, troupeId, fileAndVersion.file.id, fileAndVersion.version);

      if(embeddedFileInfo.conversionNotRequired) {
        /* No need to persist the embedded file */
        return;
      }

      var db = mongoose.connection.db;
      var GridStore = mongoose.mongo.GridStore;
      var gridFileName = createEmbeddedFileName(fileAndVersion.file.id, fileAndVersion.version);
      var gs = new GridStore(db, gridFileName, "w", {
          "content_type": embeddedFileInfo.mimeType,
          "metadata":{
            /* Attributes go here */
            usage: "embedded",
            troupeId: fileAndVersion.file.troupeId,
            fileName: fileAndVersion.file.fileName
          }
      });

      gs.writeFile(embeddedFileInfo.fileName, function(err) {
        if (err) return winston.error(err);
      });

    });

    /** Continue regardless of what happens in generate... */
    callback(err, fileAndVersion);

  });
}


function findByIds(ids, callback) {
  persistence.File.where('_id').in(ids)
    .slaveOk()
    .run(callback);
}

module.exports = {
  findByTroupe: findByTroupe,
  findById: findById,
  findByIds: findByIds,
  findByFileName: findByFileName,
  storeFile: storeFile,
  getFileStream: getFileStream,
  getFileEmbeddedStream: getFileEmbeddedStream,
  getThumbnailStream: getThumbnailStream
};