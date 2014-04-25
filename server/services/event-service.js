/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence   = require("./persistence-service");
var processChat   = require('../utils/process-chat');
var appEvents     = require("../app-events");
var ObjectID      = require('mongodb').ObjectID;

exports.newEventToTroupe = function(troupe, user, text, meta, payload, callback) {
  if(!troupe) return callback("Invalid troupe");
  if(!text) return callback("Text required");

  text = "" + text;

  var event = new persistence.Event();

  event.fromUserId = user ? user.id : null;
  event.toTroupeId = troupe.id;
  event.sent       = new Date();
  event.text       = text;
  var parsed       = processChat(text);
  event.html       = parsed.html;
  event.meta       = meta;
  event.payload    = payload;

  event.save(function (err) {
    if(err) return callback(err);

    appEvents.hookEvent({username: 'gitter', room: troupe.uri, text: text});

    return callback(null, event);
  });
};

exports.findEventsForTroupe = function(troupeId, options, callback) {
  var q = persistence.Event
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
    .limit(options.limit || 20)
    .skip(options.skip || 0)
    .exec(function(err, results) {
      if(err) return callback(err);

      return callback(null, results.reverse());
    });
};
