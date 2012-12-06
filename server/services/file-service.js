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

/* private */
function createFileName(fileId, version) {
  return "attachment:" + fileId + ":" + version;
}

/* TODO: remove all referneced to embedded, we're calling them preview from now on */
function createEmbeddedFileName(fileId, version) {
  return "preview:" + fileId + ":" + version;
}

function createThumbNailFileName(fileId, version) {
  return "thumb:" + fileId + ":" + version;
}

/* public */
function findById(id, callback) {
  persistence.File.findById(id , function(err, file) {
    callback(err, file);
  });
}

function deleteById(id, callback) {
  persistence.File.findById(id , function(err, file) {
    file.remove();
    callback(err);
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

  GridStore.exist(db, gridFileName, function(err, result) {
    if (err) return callback(err);

    if(!result) return callback(null, false);

    compareHashSums(gridFileName, temporaryFile, callback);
  });
}

/**
 * Callback signature is function(err, mimeType, etagMatches, etag, stream);
 */
function locateAndStream(troupeId, fileName, version, presentedEtag, gridFileNamingStrategy, callback) {
  findByFileName(troupeId, fileName, function(err, file) {
    if (err) return callback(err);
    if (!file) return callback(/* no match */);

    if(file.versions.length === 0) {
      return callback(/* no match */);
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
        return callback(/* no match */);
      }

      var gs = new GridStore(db, gridFileName, 'r');
      gs.open(function(err, gs) {
        if(err) return callback(err);
        if(!gs) return callback(/* no match */);

        if(presentedEtag && presentedEtag === gs.md5) {
          return callback(null, gs.contentType, true, gs.md5);
        }

        var readStream = gs.stream(true);
        callback(null, gs.contentType, false, gs.md5, readStream);
      });

    });

  });

}

function getFileEmbeddedStream(troupeId, fileName, version, presentedEtag, callback) {
  locateAndStream(troupeId, fileName, version, presentedEtag, function(fileId, version) {
    return createEmbeddedFileName(fileId, version);
  }, callback);
}

function getThumbnailStream(troupeId, fileName, version, presentedEtag, callback) {
  locateAndStream(troupeId, fileName, version, presentedEtag, function(fileId, version) {
    return createThumbNailFileName(fileId, version);
  }, callback);
}

function getFileStream(troupeId, fileName, version, presentedEtag, callback) {
  locateAndStream(troupeId, fileName, version, presentedEtag, function(fileId, version) {
    return createFileName(fileId, version);
  }, callback);
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
  winston.debug("storeFileVersionInGrid");

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
      version.thumbnailStatus = 'GENERATING';
      version.source = null; //TODO: add source

      file.versions = [version];

      file.save(function(err) {
          if (err) return callback(err);

          uploadFileToGrid(file, 1, temporaryFile, function(err, file) {
            if(!err) {
              appEvents.fileEvent('createNew', { troupeId: troupeId, fileId: file.id });
              appEvents.fileEvent('createVersion', { troupeId: troupeId, fileId: file.id, version: 1, temporaryFile: temporaryFile, mimeType: file.mimeType });
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
      version.thumbnailStatus = 'GENERATING';
      version.source = null; //TODO: add source
      file.versions.push(version);

      /* File exists, add a version */
      file.save(function(err) {
        if (err) return callback(err);
        var versionNumber = file.versions.length;
        uploadFileToGrid(file, versionNumber, temporaryFile, function(err, file) {
          if(!err) {
            appEvents.fileEvent('createVersion', { troupeId: troupeId, fileId: file.id, version: versionNumber, temporaryFile: temporaryFile, mimeType: file.mimeType });
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

function storeFile(options, callback) {
  winston.debug("storeFile");

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

    /** Continue regardless of what happens in generate... */
    callback(err, fileAndVersion);

  });
}


function findByIds(ids, callback) {
  persistence.File.where('_id').in(ids)
    .slaveOk()
    .exec(callback);
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