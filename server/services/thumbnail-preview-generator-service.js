/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var kue = require('../utils/kue');
var jobs;

var THUMBNAIL_STRATEGY = 1;
var PREVIEW_STRATEGY = 1;

exports.startWorkers = function() {
  jobs = kue.createQueue()
  var persistence = require("./persistence-service");
  var winston = require("winston");
  var image = require("../utils/image");
  var converterService = require("../utils/converter-service-client");
  var gridfs = require("../utils/gridfs");
  var fs = require("fs");
  var temp = require("temp");

  jobs.process('generate-thumbnail', 20, function(job, done) {
    directGenerateThumbnail(job.data.options, done);
  });

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
   * This converter will delete the local file that it converts (if one is available),
   * otherwise it will download it from mongo and then delete the downloaded file
   */
  function directGenerateThumbnail(data, callback) {
    winston.debug("Generating thumbnails and previews for latest version file", data);

    // parameters
    var fileId = data.fileId;
    var troupeId = data.troupeId;
    var mongoFileName = data.mongoFileName;
    var temporaryFile = data.temporaryFile; // local path to the file, not always on the same server as this is executing on
    var mimeType = data.mimeType;
    var version = data.version;

    fs.exists(temporaryFile, function (exists) {
      // if the file is not on the same server then download from mongo
      if (exists) {
        startConversion(callback);
        return;
      }

      // Temporary file doesn't exist, generate a new name
      temporaryFile = temp.path({ prefix: 'thumnail-preview-generator-'});

      winston.info("Downloading file from grid fs to create thumbnail.");
      gridfs.downloadFile({ fileName: mongoFileName, localFileName: temporaryFile }, function(err) {
        if(err) return callback(err);

        startConversion(function(err) {
          if(err) return callback(err);
          fs.unlink(temporaryFile);
          callback();
        });
      });

    });



    function startConversion(callback) {
      var previewGenerationStrategy = getPreviewGenerationStrategy(data.mimeType);
      var thumbnailGenerationStategy = getThumbnailGenerationStrategy(data.mimeType);

      if(previewGenerationStrategy) {
        previewGenerationStrategy(temporaryFile, mimeType, previewGenerationCallback);
      }

      if(thumbnailGenerationStategy) {
        thumbnailGenerationStategy(temporaryFile, mimeType, thumbnailGenerationCallback);
      } else if(!previewGenerationStrategy) {
        winston.warn(mimeType + " has no thumbnail generation strategy");
        updateVersionThumbnailStatus('NO_THUMBNAIL', null);
      }

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

        var uploadFileParams = {
          fileName: "thumb:" + fileId + ":" + version,
          localFileName: result.fileName, // the new thumbnail file that has been created
          mimeType: result.mimeType,
          metadata: {
            usage: "thumbnail",
            fileId: fileId,
            troupeId: troupeId,
            version: version,
            thumbnailStrategy: THUMBNAIL_STRATEGY
          }
        };

        /* Save the preview to the gridfs */
        gridfs.uploadFile(uploadFileParams, function(err) {

          // delete the temp thumbnail file now that it is in grid fs.
          fs.unlink(result.fileName);

          if(err) {
            winston.error("Unexpected error uploading file to gridfs", { exception: err });
            updateVersionThumbnailStatus('NO_THUMBNAIL', err);
            return ;
          }

          updateVersionThumbnailStatus('GENERATED', null);
        });
      }

      function previewGenerationCallback(err, result) {
        if(err) {
          // for some reason failed preview generation
          // was resulting in thumbnail permanently set to GENERATING
          updateVersionThumbnailStatus('NO_THUMBNAIL', err);
          return winston.error("Preview generation failed", { exception: err });
        }

        var uploadFileParams = {
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
        };
        /* Save the preview to the gridfs */
        gridfs.uploadFile(uploadFileParams, function(err) {
          if(err) return winston.error("Unexpected error uploading file to gridfs", { exception: err });

          winston.debug("Updating previewMimeType to " + result.mimeType + " for file " + fileId);

          // delete the newly created local preview file now that it is on grid fs
          fs.unlink(result.fileName);

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
      }
    }

  }
};

exports.generateThumbnail = function(options, callback) {
  if(!jobs) jobs = kue.createQueue();

  jobs.create(
    'generate-thumbnail',
    {
      title: 'Thumbnail generation',
      options: options
    }
  )
  .attempts(5)
  .save(callback);
};

