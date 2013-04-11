/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require("./persistence-service");
var mongoose = require("mongoose");
var mime = require("mime");
var winston = require("winston");
var Q = require("q");
var crypto = require('crypto');
var statsService = require("./stats-service");
var fs = require('fs');
var thumbnailPreviewGeneratorService = require("./thumbnail-preview-generator-service");
var mongooseUtils = require('../utils/mongoose-utils');

/* private */
function getMainFileName(fileId, version) {
  return "attachment:" + fileId + ":" + version;
}

/* TODO: remove all referneced to embedded, we're calling them preview from now on */
function getEmbeddedFileName(fileId, version) {
  return "preview:" + fileId + ":" + version;
}

function getThumbnailFileName(fileId, version) {
  return "thumb:" + fileId + ":" + version;
}

/* public */
function findById(id, callback) {
  persistence.File.findById(id , function(err, file) {
    callback(err, file);
  });
}

/* private */
function uploadFileToGrid(file /* mongo file object */, version, temporaryFile, callback) {
  winston.info('Uploading file to grid: ' + file.fileName + "(" + version + ")");

  var db = mongoose.connection.db;
  var GridStore = mongoose.mongo.GridStore;
  var gridFileName = getMainFileName(file.id, version);
  var gs = new GridStore(db, gridFileName, "w", {
      "content_type": file.mimeType,
      "metadata":{
        /* Attributes go here */
        usage: "attachment",
        troupeId: file.troupeId,
        fileName: file.fileName
      }
  });

  // write local file to grid fs
  gs.writeFile(temporaryFile, function(err) {
    if (err) return callback(err);

    // the local temp file can be deleted now that it is stored in grid fs,
    // express is setup to delete files in the upload folder after an hour or so.
    // thumbnail generator potentially runs on another computer and doesn't callback here, so cant be responsible for deleting the file.
    // fs.unlink(temporaryFile); // will cause thumbnail generator to always download from mongo and then delete the file itself.

    // generate thumbnail from local file.
    thumbnailPreviewGeneratorService.generateThumbnail({
      fileId: file.id,
      troupeId: file.troupeId,
      temporaryFile: temporaryFile, // passed in as optimisation just in case the thumbnail generator is operating on the same server
      mongoFileName: gridFileName, // used by the generator to download the file from grid fs
      mimeType: file.mimeType,
      version: version
    });

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
  gs.open(function(err/*, gridStore*/) {
    if (err) return gsOp.reject(new Error(err));

    gsOp.resolve(gs.md5);

    gs.close(function(/*err*/) {});
  });

  calculateMd5ForFile(temporaryFile, fsOp.makeNodeResolver());

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
  var gridFileName = getMainFileName(file.id, version);

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
    return getEmbeddedFileName(fileId, version);
  }, callback);
}

function getThumbnailStream(troupeId, fileName, version, presentedEtag, callback) {
  locateAndStream(troupeId, fileName, version, presentedEtag, function(fileId, version) {
    return getThumbnailFileName(fileId, version);
  }, callback);
}

function getFileStream(troupeId, fileName, version, presentedEtag, callback) {
  locateAndStream(troupeId, fileName, version, presentedEtag, function(fileId, version) {
    return getMainFileName(fileId, version);
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
  winston.verbose("storeFileVersionInGrid");

  var troupeId = options.troupeId;
  var creatorUserId = options.creatorUserId;
  var fileName = options.fileName;
  var mimeType = options.mimeType;
  var temporaryFile = options.file; // this is the file path
  var version;


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
            if(err) return callback(err);

            statsService.event('new_file', { troupeId: troupeId });

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
          if(err) return callback(err);
          statsService.event('new_file_version', { troupeId: troupeId });
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
  var fileName = options.fileName;
  var mimeType = options.mimeType;

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

function deleteFileFromGridStore(fileName, callback) {
  if(!callback) callback = function(err) {
    if(err) winston.error("Error while deleting file from gridstore: ", { fileName: fileName, exception: err } );
  };

  winston.verbose("Deleting file from gridstore: ", { fileName: fileName } );

  var db = mongoose.connection.db;
  var GridStore = mongoose.mongo.GridStore;

  GridStore.unlink(db, fileName, callback);
}

mongooseUtils.attachNotificationListenersToSchema(persistence.schemas.FileSchema, {
  onRemove: function(model) {
    var versions = model.versions;
    var fileId = model.id;

    versions.forEach(function(fileVersion, index) {
      var version = index + 1;
      deleteFileFromGridStore(getMainFileName(fileId, version));
      deleteFileFromGridStore(getEmbeddedFileName(fileId, version));
      deleteFileFromGridStore(getThumbnailFileName(fileId, version));
    });
  }
});

module.exports = {
  findByTroupe: findByTroupe,
  findById: findById,
  findByIds: findByIds,
  findByFileName: findByFileName,
  storeFile: storeFile,
  getFileStream: getFileStream,
  getFileEmbeddedStream: getFileEmbeddedStream,
  getThumbnailStream: getThumbnailStream,

  /* For Testing */
  getMainFileName:getMainFileName,
  getEmbeddedFileName: getEmbeddedFileName,
  getThumbnailFileName: getThumbnailFileName
}