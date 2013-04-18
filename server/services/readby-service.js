/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var RedisBatcher = require('../utils/redis-batcher').RedisBatcher;
var Fiber = require('../utils/fiber');
var persistence = require('./persistence-service');
var ObjectID = require('mongodb').ObjectID;
var assert = require('assert');
var batcher = new RedisBatcher('readby', 0);
var winston = require('winston');
var appEvents = require("../app-events");

function asObjectId(stringId) {
  return new ObjectID(stringId);
}

batcher.listen(function(key, userIdStrings, done) {
  var kp = key.split(':', 3);

  // Ignore everything except chats for now
  if(kp[0] !== 'chat') return done();

  var troupeId = asObjectId(kp[1]);
  var chatId = asObjectId(kp[2]);

  var userIds = new Array(userIdStrings.map(asObjectId));

  persistence.ChatMessage.findOneAndUpdate(
    { _id: chatId, toTroupeId: troupeId },
    { $addToSet:  { 'readBy': { $each: userIds } } },
    { select: { readBy: 1, _tv: 1 } },
    function(err, chat) {
      if(err) return done(err);

      if(!chat) {
        winston.info('Weird. No chat message found');
      } else {
        var url = "/troupes/" + troupeId + "/chatMessages";
        debugger;
        appEvents.dataChange2(url, 'patch', {
          id: "" + chatId,
          readBy: chat.readBy.length,
          v: chat._tv ? 0 + chat._tv : undefined
        });


      }

      done();
    });

});

exports.recordItemsAsRead = function(userId, troupeId, items, callback) {
  assert(userId);
  if(!items.chat || !items.chat.length) return callback(); // Don't bother with anything other than chats for the moment

  var fiber = new Fiber();

  var itemIds = items.chat;
  itemIds.forEach(function(id) {
    batcher.add('chat:' + troupeId + ':' + id, userId, fiber.waitor());
  });

  fiber.all().then(function() {
    callback();
  }, callback);

};
