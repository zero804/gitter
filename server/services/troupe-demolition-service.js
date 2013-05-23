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

      return fileWaitor(null, files.length);
    });
    troupe.remove(f.waitor());

    f.all().spread(function(chats, removedUsers, invites, requests, conversations, files) {
      callback(null, chats, removedUsers, invites, requests, conversations, files);
    }, callback);
  });
}

function deleteEligibleTroupes(callback) {
  var roughlyOneWeekAgo = new Date(Date.now() - 7 * 86400 * 1000);

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

      f.all().then(function(counts) {
        var totals = counts.reduce(function(memo, count) {
          memo.chats          = (memo.chats || 0) + count[0];
          memo.removedUsers   = (memo.removedUsers || 0) + count[1];
          memo.invites        = (memo.invites || 0) + count[2];
          memo.requests       = (memo.requests || 0) + count[3];
          memo.conversations  = (memo.conversations || 0) + count[4];
          memo.files          = (memo.files || 0) + count[5];
          return memo;
        }, {});

        totals.troupes = troupes.length;

        callback(null, totals);
      }, callback);
    });
}

module.exports = {
  deleteEligibleTroupes: deleteEligibleTroupes,
  deleteTroupe: deleteTroupe
};