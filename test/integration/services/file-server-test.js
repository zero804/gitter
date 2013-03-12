/*jslint node:true, unused:true*/
/*global describe:true it:true*/
"use strict";

var assert = require("better-assert");
var fs = require("fs");
var temp = require("temp");

describe('file-service', function() {
  var fileService = require("../../../server/services/file-service");
  var persistence = require("../../../server/services/persistence-service");
  var mongoose = require('mongoose');

  describe('#deleteFileFromGridStore()', function() {

    /*
    *
    */
    it('should delete files when they are dereferenced from a troupe', function(done) {
      var troupe = persistence.Troupe({ name: "Test "});
      troupe.save(function(err) {
        if(err) return done(err);

        temp.open('test', function(err, info) {
          fs.write(info.fd, "Hello");
          fs.close(info.fd, function(err) {
            if(err) return done(err);

            fileService.storeFile({
              troupeId: troupe.id,
              creatorUserId: null,
              fileName: 'temp.txt',
              mimeType: 'text/text',
              file: info.path
            }, function(err, fileAndVersion) {
              if(err) return done(err);

              var db = mongoose.connection.db;
              var GridStore = mongoose.mongo.GridStore;
              var file = fileAndVersion.file;
              var gridFileName = fileService.getMainFileName(file.id, fileAndVersion.version);

              GridStore.exist(db, gridFileName, function(err, result) {
                if(!result) return done("File " + gridFileName + " not found");

                file.remove(function(err) {
                  if(err) return done(err);

                  setTimeout(function() {

                    GridStore.exist(db, gridFileName, function(err, result) {
                      if(err) return done(err);
                      if(result) return done("File " + gridFileName + " still exists but should have been deleted");
                      troupe.remove(function(err) {
                        done(err);
                      });

                    });

                  }, 100);

                });
              });

            });
          });
        });
     });
    });
  });

});