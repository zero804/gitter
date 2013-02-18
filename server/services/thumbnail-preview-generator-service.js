/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var kue = require('../utils/kue'),
    jobs = kue.createQueue();


var THUMBNAIL_STRATEGY = 1;
var PREVIEW_STRATEGY = 1;

exports.startWorkers = function() {
  var persistence = require("./persistence-service");
  var winston = require("winston");
  var image = require("../utils/image");
  var converterService = require("../utils/converter-service-client");
  var gridfs = require("../utils/gridfs");

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
    image.generateThumbnail(fileName, 180, 180, function(err, thumbnailFile) {
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

    if(/^image\//.test(mimeType) || 'application/postscript'.indexOf(mimeType) >= 0) {
      return imageMagickPreviewGenerationStategy;
    }

  }

  function getThumbnailGenerationStrategy(mimeType) {
    if([
      'application/pdf',
      'text/plain'
      ].indexOf(mimeType) >= 0) {
      return imageMagickThumbnailGenerationStategy;
    }

    if(/^image\//.test(mimeType)) {
      return imageMagickThumbnailGenerationStategy;
    }
  }

  /*
   * Callback is function(err) - has no result
   */
  function directGenerateThumbnail(data, callback) {
    var fileId = data.fileId;
    var troupeId = data.troupeId;
    var temporaryFile = data.temporaryFile;
    var mimeType = data.mimeType;
    var version = data.version;

    // Some Embedded function
    function updateVersionThumbnailStatus(status, higherLevelError) {
      persistence.File.findById(fileId, function(err, file) {
        if(err) return winston.error("Unable to update thumbnail status", { exception: err });

        file.versions[version - 1].thumbnailStatus = status;
        file.save(function(err) {
          if(err) winston.error("Unable to save update to thumbnail status", { exception: err });

          if(higherLevelError) return callback(higherLevelError);
          return callback(err);
        });

      });
    }

    function thumbnailGenerationCallback(err, result) {
      if(err) {
        winston.error("Thumbnail generation failed", { exception: err });
        updateVersionThumbnailStatus('NO_THUMBNAIL', err);
        return;
      }

      /* Save the preview to the gridfs */
      gridfs.uploadFile({
        fileName: "thumb:" + fileId + ":" + version,
        localFileName: result.fileName,
        mimeType: result.mimeType,
        metadata: {
          usage: "thumbnail",
          fileId: fileId,
          troupeId: troupeId,
          version: version,
          thumbnailStrategy: THUMBNAIL_STRATEGY
        }
      }, function(err) {
        if(err) {
          winston.error("Unexpected error uploading file to gridfs", { exception: err });
          updateVersionThumbnailStatus('NO_THUMBNAIL', err);
          return ;
        }

        updateVersionThumbnailStatus('GENERATED', null);
      });
    }

    winston.debug("Generating thumbnails and previews for latest version file", data);

    var previewGenerationStrategy = getPreviewGenerationStrategy(data.mimeType);
    var thumbnailGenerationStategy = getThumbnailGenerationStrategy(data.mimeType);

    if(previewGenerationStrategy) {
      previewGenerationStrategy(temporaryFile, mimeType, function(err, result) {
        if(err) return winston.error("Preview generation failed", { exception: err });

        /* Save the preview to the gridfs */
        gridfs.uploadFile({
          fileName: "preview:" + fileId + ":" + version,
          localFileName: result.fileName,
          mimeType: result.mimeType,
          metadata: {
            usage: "preview",
            fileId: fileId,
            troupeId: troupeId,
            version: version,
            previewStrategy: PREVIEW_STRATEGY
          }
        }, function(err) {
          if(err) return winston.error("Unexpected error uploading file to gridfs", { exception: err });

          winston.debug("Updating previewMimeType to " + result.mimeType + " for file " + fileId);
          persistence.File.update({ _id: fileId }, { previewMimeType: result.mimeType }, {}, function(err, numAffected) {
            if(err) return winston.error("Error updating previewMimeType", err);
            if(!numAffected) return winston.error("Update of previewMimeType affected zero rows. Something is wrong.");
          });
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
        updateVersionThumbnailStatus('NO_THUMBNAIL', null);
      }
    }
  }

  jobs.process('generate-thumbnail', 20, function(job, done) {
    directGenerateThumbnail(job.data.options, done);
  });
};

exports.generateThumbnail = function(options, callback) {
  jobs.create('generate-thumbnail', {
    title: 'Thumbnail generation',
    options: options
  }).attempts(5)
    .save(callback);
};

