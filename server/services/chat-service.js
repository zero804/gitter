/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require("./persistence-service"),
    troupeService = require("./troupe-service"),
    statsService = require("./stats-service");
var ObjectID = require('mongodb').ObjectID;

exports.newChatMessageToTroupe = function(troupe, user, text, callback) {
  if(!troupe) return callback("Invalid troupe");

  if(!troupeService.userHasAccessToTroupe(user, troupe)) return callback("Access denied");

  var chatMessage = new persistence.ChatMessage();
  chatMessage.fromUserId = user.id;
  chatMessage.toTroupeId = troupe.id;
  chatMessage.sent = new Date();
  chatMessage.text = text;
  chatMessage.save(function (err) {
    if(err) return callback(err);

    statsService.event("new_chat", {
      fromUserId: user.id,
      toTroupeId: troupe.id
    });

    return callback(null, chatMessage);
  });
};

exports.findById = function(id, callback) {
  persistence.ChatMessage.findById(id, function(err, chatMessage) {
    callback(err, chatMessage);
  });
};

 exports.findByIds = function(ids, callback) {
  persistence.ChatMessage
    .where('_id').in(ids)
    .exec(callback);
};

exports.findChatMessagesForTroupe = function(troupeId, options, callback) {
  var q = persistence.ChatMessage
    .where('toTroupeId', troupeId);

  if(options.startId) {
    var id = new ObjectID(options.startId);
    q = q.where('_id').gte(id);
  }

  q.sort({ sent: 'desc' })
    .limit(options.limit)
    .skip(options.skip)
    .exec(callback);

  console.log(q);
};