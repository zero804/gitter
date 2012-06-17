/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

/** TODO: Currently this service is using the eventbus (pubsub) but it should move to a work queue manager (queue) */

var persistence = require("./persistence-service");
var appEvents = require("../app-events");
var winston = require("winston");
var image = require("../utils/image");
var converterService = require("../utils/converter-service-client");
var gridfs = require("../utils/gridfs");

function createEmbeddedFileName(fileId, version) {
  return "embedded:" + fileId + ":" + version;
}

function createThumbNailFileName(fileId, version) {
  return "thumb:" + fileId + ":" + version;
}

function pdfPreviewGenerationStategy(fileName, mimeType, callback) {
  converterService.convert({fileName: fileName, mimeType: mimeType}, function(err, result) {
    if(err) return callback(err);

    callback(null, { fileName: result.fileName, mimeType: result.mimeType });
  });
}

function imageMagickPreviewGenerationStategy(fileName, mimeType, callback) {
  image.generateThumbnail(fileName, 400, 400, function(err, thumbnailFile) {
    if(err) return callback(err);

    callback(null, { fileName: thumbnailFile, mimeType: 'image/jpeg' });
  });
}

function imageMagickThumbnailGenerationStategy(fileName, mimeType, callback) {
  image.generateThumbnail(fileName, 128, 128, function(err, thumbnailFile) {
    if(err) return callback(err);

    callback(null, { fileName: thumbnailFile, mimeType: 'image/jpeg' });
  });
}

function getPreviewGenerationStrategy(mimeType) {
  if([
    'application/msword',
    'application/rtf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ].indexOf(mimeType) >= 0) {
    return pdfPreviewGenerationStategy;
  }

  if(/^image\//.test(mimeType)) {
    return imageMagickPreviewGenerationStategy;
  }
}

function getThumbnailGenerationStrategy(mimeType) {
  if([
    'application/pdf'
    ].indexOf(mimeType) >= 0) {
    return imageMagickThumbnailGenerationStategy;
  }

  if(/^image\//.test(mimeType)) {
    return imageMagickThumbnailGenerationStategy;
  }
}

function onCreateFileVersion(data) {
  var fileId = data.fileId;
  var troupeId = data.troupeId;
  var temporaryFile = data.temporaryFile;
  var mimeType = data.mimeType;
  var version = data.version;

  function thumbnailGenerationCallback(err, result) {
    if(err) return winston.error("Thumbnail generation failed", err);

      /* Save the preview to the gridfs */
      gridfs.uploadFile({
        fileName: "thumb:" + fileId + ":" + version,
        localFileName: result.fileName,
        mimeType: result.mimeType,
        metadata: {
          usage: "thumbnail",
          fileId: fileId,
          troupeId: troupeId,
          version: version
        }
      }, function(err) {
        if(err) return winston.error("Unexpected error uploading file to gridfs", err);

        appEvents.fileEvent('createThumbnail', { troupeId: troupeId, fileId: fileId, version: version });
      });
  }

  winston.debug("Generating thumbnails and previews for latest version file", data);

  var previewGenerationStrategy = getPreviewGenerationStrategy(data.mimeType);
  var thumbnailGenerationStategy = getThumbnailGenerationStrategy(data.mimeType);

  if(previewGenerationStrategy) {
    previewGenerationStrategy(temporaryFile, mimeType, function(err, result) {
      if(err) return winston.error("Preview generation failed", err);

      /* Save the preview to the gridfs */
      gridfs.uploadFile({
        fileName: "preview:" + fileId + ":" + version,
        localFileName: result.fileName,
        mimeType: result.mimeType,
        metadata: {
          usage: "preview",
          fileId: fileId,
          troupeId: troupeId,
          version: version
        }
      }, function(err) {
        if(err) return winston.error("Unexpected error uploading file to gridfs", err);

        persistence.File.update({ _id: fileId }, { previewMimeType: result.mimeType });
      });

      /* Sometimes we don't know what out thumbnail generation stategy is going to be until we've generated the preview */
      if(!thumbnailGenerationStategy) {
        var thumbnailGenerationStategy2 = getThumbnailGenerationStrategy(result.mimeType);
        if(thumbnailGenerationStategy2) {
          thumbnailGenerationStategy2(result.fileName, result.mimeType, thumbnailGenerationCallback);
        } else {
          winston.warn(result.mimeType + " has no thumbnail generation strategy");
        }
      }
    });
  }

  if(thumbnailGenerationStategy) {
    thumbnailGenerationStategy(temporaryFile, mimeType, thumbnailGenerationCallback);
  } else {
    if(!previewGenerationStrategy) {
      winston.warn(mimeType + " has no thumbnail generation strategy");
    }
  }
}

function install() {
  appEvents.onFileEvent(function(data) {
    switch(data.event) {
      case 'createVersion':
        onCreateFileVersion(data);
        break;
    }
  });
}

module.exports = {
  install: install
}