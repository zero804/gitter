/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var kue = require('../utils/kue');
var jobs;

var THUMBNAIL_STRATEGY = 1;
var PREVIEW_STRATEGY = 1;

exports.startWorkers = function() {
  var persistence = require("./persistence-service");
  var winston = require("winston");
  var image = require("../utils/image");
  var converterService = require("../utils/converter-service-client");
  var gridfs = require("../utils/gridfs");
  var fs = require("fs");
  var temp = require("temp");
  var Q = require('q');

  jobs = kue.createQueue();

  jobs.process('generate-thumbnail', 20, function(job, done) {
    directGenerateThumbnail(job.data.options, done);
  });

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
      return {
        outputMimeType: 'application/pdf',
        strategy: pdfPreviewGenerationStategy
      };
    }

    if(/^image\//.test(mimeType) || mimeType === 'application/postscript') {
      return {
        outputMimeType: 'image/jpeg',
        strategy: imageMagickPreviewGenerationStategy
      };
    }

  }

  function getThumbnailGenerationStrategy(mimeType) {
    if([
      'application/pdf',
      'text/plain'
      ].indexOf(mimeType) >= 0) {
      return {
        outputMimeType: 'image/jpeg',
        strategy: imageMagickThumbnailGenerationStategy
      };
    }

    if(/^image\//.test(mimeType)) {
      return {
        outputMimeType: 'image/jpeg',
        strategy: imageMagickThumbnailGenerationStategy
      };
    }

  }

  /*
   * Callback is function(err) - has no result
   * This converter will delete the local file that it converts (if one is available),
   * otherwise it will download it from mongo and then delete the downloaded file
   */
  function directGenerateThumbnail(data, callback) {
    winston.verbose("Generating thumbnails and previews for latest version file", data);

    var mongoFileName = data.mongoFileName;
    var temporaryFile = data.temporaryFile; // local path to the file, not always on the same server as this is executing on

    fs.exists(temporaryFile, function (exists) {
      // if the file is not on the same server then download from mongo
      if (exists) {
        startConversion(data)
          .then(persistConversionResults)
          .then(function() { callback(); })
          .fail(callback);
        return;
      }

      var temporaryFile = temp.path({ prefix: 'thumnail-preview-generator-'});

      // Temporary file doesn't exist, generate a new name
      data.temporaryFile = temporaryFile;

      winston.info("Downloading file from grid fs to create thumbnail.");
      gridfs.downloadFile({ fileName: mongoFileName, localFileName: temporaryFile }, function(err) {
        if(err) return callback(err);

        startConversion(data)
          .then(persistConversionResults)
          .then(function() { callback(); })
          .fail(callback)
          .fin(function() {
            fs.unlink(temporaryFile);
          });
      });

    });

    function persistConversionResults(conversionResults) {
      var promises = [];
      if(conversionResults.preview) promises.push(uploadFileToGridAndDelete({
          gridFileName: 'preview:' + data.fileId + ":" + data.version,
          localFileName: conversionResults.preview.fileName,
          mimeType: conversionResults.preview.mimeType,
          usage: 'preview',
          fileId: data.fileId,
          version: data.version,
          strategyId: PREVIEW_STRATEGY,
          troupeId: data.troupeId
        }));

      if(conversionResults.thumbnail) promises.push(uploadFileToGridAndDelete({
          gridFileName: 'thumb:' + data.fileId + ":" + data.version,
          localFileName: conversionResults.thumbnail.fileName,
          mimeType: conversionResults.thumbnail.mimeType,
          usage: 'thumbnail',
          fileId: data.fileId,
          version: data.version,
          strategyId: THUMBNAIL_STRATEGY,
          troupeId: data.troupeId
        }));

      return Q.all(promises).then(function() {
        return updateFileDocument(data, conversionResults);
      });
    }
  }


  function startConversion(data) {
    var temporaryFile = data.temporaryFile; // local path to the file, not always on the same server as this is executing on
    var mimeType = data.mimeType;

    var previewGeneration = getPreviewGenerationStrategy(mimeType);
    var thumbnailGeneration = getThumbnailGenerationStrategy(mimeType);

    if(!thumbnailGeneration && !previewGeneration) {
      return emptyConversationPromise();
    }

    if(previewGeneration && !thumbnailGeneration) {
      /* Sometimes we don't know what out thumbnail generation stategy is going to be until we've generated the preview */
      return generateThumbnailFromPreviewPromise();
    }

    return generateThumbnailAndPreviewPromise();

    // Generates both files in parallel
    function generateThumbnailAndPreviewPromise() {
      var promises = [];
      if(previewGeneration) promises.push(softFailPromise(previewGeneration.strategy(temporaryFile, mimeType)));
      if(thumbnailGeneration) promises.push(softFailPromise(thumbnailGeneration.strategy(temporaryFile, mimeType)));

      var doneDeferred = Q.defer();
      Q.all(promises).then(function(results) {
        var previewResult, thumbnailResult;
        if(previewGeneration) previewResult = results.shift();
        if(thumbnailGeneration) thumbnailResult = results.shift();

        doneDeferred.resolve({
          preview: previewResult,
          thumbnail: thumbnailResult
        });

      }).fail(function(err) {
        winston.error("A fail happened where it never should!", { exception: err });
      });

      return doneDeferred.promise;
    }

    // Generates the preview and then uses that to generate the thumbnail
    function generateThumbnailFromPreviewPromise() {
      var doneDeferred = Q.defer();

      var previewPromise = previewGeneration.strategy(temporaryFile, mimeType);
      previewPromise.then(function(previewResult) {
        var thumbnailGeneration = getThumbnailGenerationStrategy(previewResult.mimeType);

        if(thumbnailGeneration) {
          thumbnailGeneration.strategy(previewResult.fileName, previewResult.mimeType).then(function(thumbnailResult) {
            doneDeferred.resolve({
              preview: previewResult,
              thumbnail: thumbnailResult
            });
          }).fail(function(err) {
            winston.error("Unable to generate thumbnail from preview", { exception: err });
            doneDeferred.resolve({
              preview: previewResult,
              thumbnail: null
            });
          });

          return;
        }

        winston.warn(previewResult.mimeType + " has no thumbnail generation strategy");
        doneDeferred.resolve({
          preview: previewResult,
          thumbnail: null
        });

      }).fail(function(err) {
        winston.error("Unable to generate preview, and therefore won't be able to generate thumbnail", { exception: err });
        doneDeferred.resolve({
          preview: null,
          thumbnail: null
        });
      });

      return doneDeferred.promise;
    }

    // Doesn't generate either file
    function emptyConversationPromise() {
      var doneDeferred = Q.defer();
      doneDeferred.resolve({
        preview: null,
        thumbnail: null
      });
      return doneDeferred.promise;
    }

    // Takes a failed promise and makes it look like a success
    function softFailPromise(promise) {
      var doneDeferred = Q.defer();
      promise.then(function(result) {
        doneDeferred.resolve(result);
      }).fail(function(err) {
        winston.error("Generation failed", { exception: err });
        doneDeferred.resolve(null);
      });
      return doneDeferred.promise;
    }

  }


  function uploadFileToGridAndDelete(options) {
    var gridFileName = options.gridFileName;
    var localFileName = options.localFileName;
    var mimeType = options.mimeType;
    var usage = options.usage;
    var fileId = options.fileId;
    var version = options.version;
    var strategyId = options.strategyId;
    var troupeId = options.troupeId;

    var uploadFileParams = {
      fileName: gridFileName,
      localFileName: localFileName,
      mimeType: mimeType,
      metadata: {
        usage: usage,
        fileId: fileId,
        troupeId: troupeId,
        version: version,
        strategyId: strategyId
      }
    };

    winston.verbose("uploadFileToGridAndDelete",uploadFileParams);

    var deferred = Q.defer();

    /* Save the preview to the gridfs */
    gridfs.uploadFile(uploadFileParams, function(err) {

      // delete the temp thumbnail file now that it is in grid fs.
      fs.unlink(localFileName);

      if(err) {
        winston.error("Unexpected error uploading file to gridfs", { exception: err });
        return deferred.reject(err);
      }

      deferred.resolve(uploadFileParams);
    });

    return deferred.promise;
  }

  function updateFileDocument(data, conversionResults) {
    var deferred = Q.defer();

    var fileId = data.fileId;
    var version = data.version;


    persistence.File.findById(fileId, function(err, file) {
      if(err) return deferred.reject(err);
      if(!file) return deferred.reject("Update of file failed as file cannot be found." + fileId);

      var previewMimeType = null, thumbnailStatus = 'NO_THUMBNAIL';

      if(conversionResults.preview) previewMimeType = conversionResults.preview.mimeType;
      if(conversionResults.thumbnail) thumbnailStatus = thumbnailStatus = 'GENERATED';

      file.versions[version - 1].thumbnailStatus = thumbnailStatus;
      file.previewMimeType = previewMimeType;
      file.save(deferred.makeNodeResolver());
    });

    return deferred.promise;
  }

  // ------------------------------
  // Generation strategies
  // ------------------------------
  // PDF Preview
  function pdfPreviewGenerationStategy(fileName, mimeType) {
    var deferred = Q.defer();

    converterService.convert({fileName: fileName, mimeType: mimeType}, function(err, result) {
      if (err) return deferred.reject(err);

      deferred.resolve({ fileName: result.fileName, mimeType: result.mimeType });
    });

    return deferred.promise;
  }

  // ImageMagick Preview
  function imageMagickPreviewGenerationStategy(fileName/*, mimeType*/) {
    var deferred = Q.defer();

    image.generatePreview(fileName, 700, 400, function(err, thumbnailFile) {
      if (err) return deferred.reject(err);

      deferred.resolve({ fileName: thumbnailFile, mimeType: 'image/jpeg' });
    });

    return deferred.promise;
  }

  // ImageMagick Thumbnail
  function imageMagickThumbnailGenerationStategy(fileName/*, mimeType*/) {
    var deferred = Q.defer();

    image.generateThumbnail(fileName, 180, 180, function(err, thumbnailFile) {
      if (err) return deferred.reject(err);

      deferred.resolve({ fileName: thumbnailFile, mimeType: 'image/jpeg' });
    });

    return deferred.promise;
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

