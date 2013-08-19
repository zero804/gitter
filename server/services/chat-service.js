/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence   = require("./persistence-service"),
    collections   = require("../utils/collections"),
    troupeService = require("./troupe-service"),
    statsService  = require("./stats-service"),
    TwitterText   =  require('../utils/twitter-text'),
    urlExtractor  = require('../utils/url-extractor');

var ObjectID = require('mongodb').ObjectID;


/* @const */
var MAX_CHAT_EDIT_AGE_SECONDS = 300;

/* @const */
var HTML_ENTITIES = {
  '&': '&amp;',
  '>': '&gt;',
  '<': '&lt;',
  '"': '&quot;',
  "'": '&#39;'
};

var SAFE_HTML_RE = /[&"'><]/g;

// HTML escaping
function safe(text) {
  return text && text.replace(SAFE_HTML_RE, function(character) {
    return HTML_ENTITIES[character];
  });
}

exports.newChatMessageToTroupe = function(troupe, user, text, callback) {
  if(!troupe) return callback("Invalid troupe");

  if(!troupeService.userHasAccessToTroupe(user, troupe)) return callback(403);

  var chatMessage = new persistence.ChatMessage();
  chatMessage.fromUserId = user.id;
  chatMessage.toTroupeId = troupe.id;
  chatMessage.sent = new Date();

  text = safe(text);
  chatMessage.text = safe(text);

  // Metadata
  chatMessage.urls            = urlExtractor.extractUrlsWithIndices(text);
  chatMessage.mentions        = TwitterText.extractMentionsWithIndices(text);
  chatMessage.metadataVersion = urlExtractor.version;

  chatMessage.save(function (err) {
    if(err) return callback(err);

    statsService.event("new_chat", {
      userId: user.id,
      troupeId: troupe.id,
      email: user.email
    });

    return callback(null, chatMessage);
  });
};

exports.updateChatMessage = function(troupe, chatMessage, user, newText, callback) {
  var age = (Date.now() - chatMessage.sent.valueOf()) / 1000;
  if(age > MAX_CHAT_EDIT_AGE_SECONDS) {
    return callback("You can no longer edit this message");
  }

  if(chatMessage.toTroupeId != troupe.id) {
    return callback("Permission to edit this chat message is denied.");
  }

  if(chatMessage.fromUserId != user.id) {
    return callback("Permission to edit this chat message is denied.");
  }

  // If the user has been kicked out of the troupe...
  if(!troupeService.userHasAccessToTroupe(user, troupe)) {
    return callback("Permission to edit this chat message is denied.");
  }

  chatMessage.text = newText;
  chatMessage.editedAt = new Date();
  chatMessage.save(function(err) {
    if(err) return callback(err);

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
    .where('_id')['in'](collections.idsIn(ids))
    .exec(callback);
};

exports.findChatMessagesForTroupe = function(troupeId, options, callback) {
  var q = persistence.ChatMessage
    .where('toTroupeId', troupeId);

  if(options.startId) {
    var startId = new ObjectID(options.startId);
    q = q.where('_id').gte(startId);
  }

  if(options.beforeId) {
    var beforeId = new ObjectID(options.beforeId);
    q = q.where('_id').lt(beforeId);
  }

  q.sort({ sent: 'desc' })
    .limit(options.limit)
    .skip(options.skip)
    .exec(callback);
};
