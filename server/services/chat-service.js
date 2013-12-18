/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence   = require("./persistence-service"),
    collections   = require("../utils/collections"),
    troupeService = require("./troupe-service"),
    statsService  = require("./stats-service"),
    TwitterText   = require('../utils/twitter-text'),
    urlExtractor  = require('../utils/url-extractor'),
    safeHtml      = require('../utils/safe-html'),
    ent           = require('ent'),
    marked        = require('marked'),
    highlight     = require('highlight.js');

/* @const */
var MAX_CHAT_EDIT_AGE_SECONDS = 300;

var ObjectID = require('mongodb').ObjectID;

exports.newRichMessageToTroupe = function(troupe, user, text, meta, callback) {
  if(!troupe) return callback("Invalid troupe");

  var chatMessage = new persistence.ChatMessage();

  chatMessage.fromUserId = user ? user.id : null;

  chatMessage.toTroupeId = troupe.id;
  chatMessage.sent = new Date();

  // Very important that we decode and re-encode!
  text = ent.decode(text);
  text = safeHtml(text); // NB don't use ent for encoding as it's a bit overzealous!

  chatMessage.text = text;

  // Metadata
  chatMessage.urls     = urlExtractor.extractUrlsWithIndices(text);
  chatMessage.mentions = TwitterText.extractMentionsWithIndices(text);
  chatMessage.issues   = urlExtractor.extractIssuesWithIndices(text);
  chatMessage._md      = urlExtractor.version;
  chatMessage.meta     = meta;

  // Skip UnreadItems, except when new files are uploaded
  chatMessage.skipAlerts = meta.type === 'file' ? false : true;

  chatMessage.save(function (err) {
    if(err) return callback(err);

    return callback(null, chatMessage);
  });
};

function parseMessage(text) {
  // Important. Do not remove! This encodes html entities (<, >, etc)
  marked.setOptions({sanitize: true});

  var urls      = [];
  var mentions  = [];
  var issues    = [];

  var r = new marked.Renderer();

  // Highlight code blocks
  r.code = function(code) {
    return '<pre><code>' + highlight.highlightAuto(code).value + '</code></pre>';
  };

  // Extract urls mentions and issues from paragraphs
  r.paragraph = function(text) {
    urls      = urls.concat(urlExtractor.extractUrlsWithIndices(text));
    mentions  = mentions.concat(TwitterText.extractMentionsWithIndices(text));
    issues    = issues.concat(urlExtractor.extractIssuesWithIndices(text));
    return text;
  };

  // Extract urls mentions and issues from headers (#8 is <h1>8</h1>) and ignore the <hx> part
  r.heading = function(text) {
    text   = '#' + text;
    issues = issues.concat(urlExtractor.extractIssuesWithIndices(text));
    return text;
  };

  console.log(issues);

  // Extract urls mentions and issues from lists
  // WIP: indices are relative to the <li> item and don't work in the context of an 
  // entire list or message :(
  r.listitem = function(text) {
    // urls      = urls.concat(urlExtractor.extractUrlsWithIndices(text));
    // mentions  = mentions.concat(TwitterText.extractMentionsWithIndices(text));
    // issues    = issues.concat(urlExtractor.extractIssuesWithIndices(text));
    return '<li>' + text + '</li>';
  };

  // Do not autolink, we do this client-side
  r.link = function(href, title, text) {
    return text;
  };

  // Generate HTML version of the message using our renderer
  var html = marked(text, {renderer: r});

  return {
    text: text,
    html: html,
    urls: urls,
    mentions: mentions,
    issues: issues
  };
}


exports.newChatMessageToTroupe = function(troupe, user, text, callback) {
  if(!troupe) return callback("Invalid troupe");

  if(!troupeService.userHasAccessToTroupe(user, troupe)) return callback(403);

  var chatMessage = new persistence.ChatMessage();
  chatMessage.fromUserId = user.id;
  chatMessage.toTroupeId = troupe.id;
  chatMessage.sent = new Date();

  // Keep the raw message.
  chatMessage.text      = text;

  var parsedMessage = parseMessage(text);
  chatMessage.html = parsedMessage.html;

  // Metadata
  chatMessage.urls      = parsedMessage.urls;
  chatMessage.mentions  = parsedMessage.mentions;
  chatMessage.issues    = parsedMessage.issues;
  chatMessage._md = urlExtractor.version;

  chatMessage.save(function (err) {
    if(err) return callback(err);

    statsService.event("new_chat", {
      userId: user.id,
      troupeId: troupe.id,
      username: user.username
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


  // Very important that we decode and re-encode!
  newText = ent.decode(newText);
  newText = safeHtml(newText); // NB don't use ent for encoding as it's a bit overzealous!

  chatMessage.text = newText;
  chatMessage.editedAt = new Date();

  var parsedMessage = parseMessage(newText);
  chatMessage.html = parsedMessage.html;

  // Metadata
  chatMessage.urls      = parsedMessage.urls;
  chatMessage.mentions  = parsedMessage.mentions;
  chatMessage.issues    = parsedMessage.issues;
  chatMessage._md = urlExtractor.version;

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

  q.sort(options.sort || { sent: 'desc' })
    .limit(options.limit || 50)
    .skip(options.skip || 0)
    .exec(function(err, results) {
      if(err) return callback(err);

      return callback(null, results.reverse());
    });
};
