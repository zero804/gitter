/*jslint node:true, unused:true*/
/*global describe:true, it:true, before:true, after:true */
"use strict";

var testRequire = require('../test-require');

var fs = require("fs");
var temp = require("temp");

var fixtureLoader = require('../test-fixtures');
var fixture = {};


describe('file-service', function() {
  var fileService = testRequire("./services/file-service");
  var mongoose = require('mongoose');

  before(fixtureLoader(fixture, {
    troupe1: { },
    user1: { }
  }));

  after(function() { fixture.cleanup(); });

  describe('#deleteFileFromGridStore()', function() {

    /*
    *
    */
    it('should delete files when they are dereferenced from a troupe', function(done) {
      temp.open('test', function(err, info) {
        fs.write(info.fd, "Hello");
        fs.close(info.fd, function(err) {
          if(err) return done(err);

          fileService.storeFile({
            troupe: fixture.troupe1.id,
            user: fixture.user1,
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

                    done();
                  });

                }, 1000);

              });
            });

          });
        });
      });

    });
  });



});
