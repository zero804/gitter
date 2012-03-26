"use strict";

var persistence = require("./persistence-service");
var mongoose = require("mongoose");

function findByTroupe(id, callback) {
  //console.log('Looking for emails in' + id);
  persistence.File.find({troupeId: id}, function(err, files) {
      callback(err, files);
    });
}

function storeFile(options, callback){
  var troupeId = options.troupeId;
  var creatorUserId = options.creatorUserId;
  var fileName = options.fileName;
  var mimeType = options.mimeType;
  var temporaryFile = options.file;


  var file = new persistence.File();
  file.troupeId = troupeId;
  file.creatorUserId = creatorUserId;
  file.fileName = fileName;
  file.mimeType = mimeType;

  file.save(function(err) {
      if (err) return callback(err);
      process.stdout.write("FILE SAVE: File to save is: " + temporaryFile);

      var db = mongoose.connection.db;
      var GridStore = mongoose.mongo.GridStore;
      var gs = new GridStore(db, file.id, "w", {
          "content_type": mimeType,
          "metadata":{
            /* Attributes go here */
          }
      });

      gs.writeFile( temporaryFile, function(err) {
        if(err) return callback(err);
        return callback(err, file);
      });

    });


}

module.exports = {
  findByTroupe: findByTroupe,
  storeFile: storeFile
};