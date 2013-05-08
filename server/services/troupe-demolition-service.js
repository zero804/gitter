/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global require: true, module: true */
"use strict";

var persistence = require("./persistence-service"),
    troupeService = require("./troupe-service"),
    fileService = require("./file-service"),
    winston = require("winston"),
    Fiber = require("../utils/fiber");

function deleteTroupe(troupeId, callback) {
  troupeService.findById(troupeId, function(err, troupe) {
    if(err) return callback(err);

    if(troupe.status != 'DELETED') return callback('Can only demolish DELETED troupes');

    var f = new Fiber();

    persistence.ChatMessage.where('toTroupeId').equals(troupeId).remove(f.waitor());
    persistence.TroupeRemovedUser.where('troupeId').equals(troupeId).remove(f.waitor());
    persistence.Invite.where('troupeId').equals(troupeId).remove(f.waitor());
    persistence.Request.where('troupeId').equals(troupeId).remove(f.waitor());
    persistence.Conversation.where('troupeId').equals(troupeId).remove(f.waitor());

    var fileWaitor = f.waitor();
    persistence.File.where('troupeId').equals(troupeId).exec(function(err, files) {
      if(err) return fileWaitor(err);

      files.forEach(function(file) {
        fileService.deleteGridstoreFiles(file, f.waitor());
        file.remove(f.waitor());
      });

      return fileWaitor();
    });

    f.all().then(function(results) {
      console.log("RESULTS!!!", results);
      callback();
    }, callback);
  });
}

function deleteEligibleTroupes(callback) {
  var roughlyOneWeekAgo = new Date(Date.now() - 0/*7 * 86400 * 1000*/);

  persistence.Troupe
    .where('status').equals('DELETED')
    .where('dateDeleted').lt(roughlyOneWeekAgo)
    .exec(function(err, troupes) {
      if(err) return callback(err);
      if(troupes.length === 0) return callback();

      var f = new Fiber();
      troupes.forEach(function(troupe) {
        winston.info("Deleting troupe " + troupe.id + " - " + troupe.name);
        deleteTroupe(troupe.id, f.waitor());
      });

      f.all().then(function() { callback(null, troupes.length); }, callback);
    });
}

module.exports = {
  deleteEligibleTroupes: deleteEligibleTroupes,
  deleteTroupe: deleteTroupe
};