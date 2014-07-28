"use strict";

var env                  = require('../utils/env');
var stats                = env.stats;

var persistence          = require("./persistence-service");
var collections          = require("../utils/collections");
var troupeService        = require("./troupe-service");
var userService          = require("./user-service");
var processChat          = require('../utils/process-chat-isolated');
var appEvents            = require('../app-events');
var Q                    = require('q');
var mongoUtils           = require('../utils/mongo-utils');
var moment               = require('moment');
var roomCapabilities     = require('./room-capabilities');
var StatusError          = require('statuserror');
var unreadItemService    = require('./unread-item-service');
var _                    = require('underscore');

/*
 * Hey Trouper!
 * Bump the version if you modify the behaviour of TwitterText.
 */
// var VERSION_INITIAL; /* = undefined; All previous versions are null due to a bug */
var VERSION_SWITCH_TO_SERVER_SIDE_RENDERING = 5;
var MAX_CHAT_MESSAGE_LENGTH = 4096;

var CURRENT_META_DATA_VERSION = VERSION_SWITCH_TO_SERVER_SIDE_RENDERING;

/* @const */
var MAX_CHAT_EDIT_AGE_SECONDS = 300;

var ObjectID = require('mongodb').ObjectID;

/**
 * Create a new chat and return a promise of the chat
 */
exports.newChatMessageToTroupe = function(troupe, user, data, callback) {
  return Q.fcall(function() {
    if(!troupe) throw new StatusError(404, 'Unknown room');

    /* You have to have text */
    if(!data.text && data.text !== "" /* Allow empty strings for now */) throw new StatusError(400, 'Text is required');
    if(data.text.length > MAX_CHAT_MESSAGE_LENGTH) throw new StatusError(400, 'Message exceeds maximum size');

    if(!troupeService.userHasAccessToTroupe(user, troupe)) throw new StatusError(403, 'Access denied');

    // TODO: validate message
    return processChat(data.text);
  })
  .then(function(parsedMessage) {
    var chatMessage = new persistence.ChatMessage({
      fromUserId: user.id,
      toTroupeId: troupe.id,
      sent: new Date(),
      text: data.text,                // Keep the raw message.
      status: data.status,            // Checks if it is a status update
      html: parsedMessage.html
    });

    /* Look through the mentions and attempt to tie the mentions to userIds */
    var mentionUserNames = parsedMessage.mentions.map(function(mention) {
      return mention.screenName;
    });

    return userService.findByUsernames(mentionUserNames)
      .then(function(users) {
      var usersIndexed = collections.indexByProperty(users, 'username');

      var mentions = parsedMessage.mentions.map(function(mention) {
        var user = usersIndexed[mention.screenName];
        var userId = user && user.id;

        return {
          screenName: mention.screenName,
          userId: userId
        };
      });

      // Metadata
      chatMessage.urls      = parsedMessage.urls;
      chatMessage.mentions  = mentions;
      chatMessage.issues    = parsedMessage.issues;
      chatMessage._md       = parsedMessage.markdownProcessingFailed ?
                                -CURRENT_META_DATA_VERSION : CURRENT_META_DATA_VERSION;

      return chatMessage.saveQ()
        .then(function() {

          // setTimeout(function() {
          //   troupe.users.forEach(function(troupeUser) {
          //     require('./unread-item-service').markItemsRead(troupeUser.userId, troupe.id, [chatMessage.id], [], { member: true });
          //   });

          // }, 100);

          var statMetadata = _.extend({
            userId: user.id,
            troupeId: troupe.id,
            username: user.username
          }, data.stats);

          stats.event("new_chat", statMetadata);


          var _msg;
          if (troupe.oneToOne) {
            var toUserId;
            troupe.users.forEach(function(_user) {
              if (_user.userId.toString() !== user.id.toString()) toUserId = _user.userId;
            });
            _msg = {oneToOne: true, username: user.username, toUserId: toUserId, text: data.text, id: chatMessage.id, toTroupeId: troupe.id };
          } else {
            _msg = {oneToOne: false, username: user.username, room: troupe.uri, text: data.text, id: chatMessage.id, toTroupeId: troupe.id };
          }

          appEvents.chatMessage(_msg);

          return chatMessage;
        });

    });
  })
  .nodeify(callback);
};

exports.updateChatMessage = function(troupe, chatMessage, user, newText, callback) {
  return Q.fcall(function() {
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
      return processChat(newText);
    })
    .then(function(parsedMessage) {
      chatMessage.html  = parsedMessage.html;
      chatMessage.editedAt = new Date();

      // Metadata
      chatMessage.urls      = parsedMessage.urls;
      chatMessage.mentions  = parsedMessage.mentions;
      chatMessage.issues    = parsedMessage.issues;
      chatMessage._md       = parsedMessage.markdownProcessingFailed ?
                                -CURRENT_META_DATA_VERSION : CURRENT_META_DATA_VERSION;

      return chatMessage.saveQ()
        .thenResolve(chatMessage);
    })
    .nodeify(callback);
};

exports.findById = function(id, callback) {
  return persistence.ChatMessage.findByIdQ(id)
    .nodeify(callback);
};

 exports.findByIds = function(ids, callback) {
  if(!ids || !ids.length) return Q.resolve([]).nodeify(callback);

  return persistence.ChatMessage
    .where('_id')['in'](collections.idsIn(ids))
    .execQ()
    .nodeify(callback);
};

// function massageMessages(message) {
//   if('html' in message && 'text' in message) {

//     if(message._md == VERSION_INITIAL) {
//       var text = unsafeHtml(message.text);
//       var d = processChat(text);

//       message.text      = text;
//       message.html      = d.html;
//       message.urls      = d.urls;
//       message.mentions  = d.mentions;
//       message.issues    = d.issues;
//     }
//   }

//   return message;
// }

/* This is much more cacheable than searching less than a date */
function getDateOfFirstMessageInRoom(troupeId) {
  return persistence.ChatMessage
    .where('toTroupeId', troupeId)
    .limit(1)
    .select({ sent: 1 })
    .sort({ _id: 'asc' })
    .lean()
    .execQ()
    .then(function(r) {
      if(!r.length) return null;
      return r[0].sent;
    });
}

function findFirstUnreadMessageId(troupeId, userId) {
  var d = Q.defer();
  unreadItemService.getFirstUnreadItem(userId, troupeId, 'chat', d.makeNodeResolver());
  return d.promise.spread(function(minId) {
    return minId;
  });
}

/**
 * Returns a promise of
 * [ messages, limitReached]
 */
exports.findChatMessagesForTroupe = function(troupeId, options, callback) {
  var findMarker;
  if(options.marker === 'first-unread' && options.userId) {
    findMarker = findFirstUnreadMessageId(troupeId, options.userId);
  }

  return Q.all([
      roomCapabilities.getMaxHistoryMessageDate(troupeId),
      findMarker
    ])
    .spread(function(maxHistoryDate, markerId) {
      if(!markerId && !options.aroundId) {
        var q = persistence.ChatMessage
          .where('toTroupeId', troupeId);

        var sentOrder = 'desc';

        if(options.beforeIncludingId) {
          var beforeIncludingId = new ObjectID(options.beforeIncludingId);
          q = q.where('_id').lte(beforeIncludingId);
        }

        if(options.afterId) {
          // Reverse the initial order for afterId
          var afterId = new ObjectID(options.afterId);
          sentOrder = 'asc';
          q = q.where('_id').gt(afterId);
        }

        if(maxHistoryDate) {
          q = q.where('sent').gte(maxHistoryDate);
        }

        return [
          q.sort(options.sort || { sent: sentOrder })
            .limit(options.limit || 50)
            .skip(options.skip || 0)
            .execQ()
            .then(function(results) {
              // results = results.map(massageMessages);
              if(sentOrder === 'desc') {
                return results.reverse();
              }

              return results;
            }),
            maxHistoryDate
          ];
      }

      var aroundId = new ObjectID(markerId || options.aroundId);

      var q1 = persistence.ChatMessage
                .where('toTroupeId', troupeId)
                .sort({ sent: 'desc' })
                .limit(Math.floor(options.limit / 2) || 25)
                .where('_id').lte(aroundId);

      var q2 = persistence.ChatMessage
                .where('toTroupeId', troupeId)
                .sort({ sent: 'asc' })
                .limit(Math.ceil(options.limit / 2) || 25)
                .where('_id').gt(aroundId);

      if(maxHistoryDate) {
        q1 = q1.where('sent').gte(maxHistoryDate);
        q2 = q2.where('sent').gte(maxHistoryDate);
      }

      /* Around case */
      return Q.all([
        q1.execQ(),
        q2.execQ(),
        ])
        .spread(function(a, b) {
          return [[].concat(a.reverse(), b), maxHistoryDate];
        });
    })
    .spread(function(results, maxHistoryDate) {
      if (!maxHistoryDate) return [results, false];

      return [
        results,
        getDateOfFirstMessageInRoom(troupeId)
          .then(function(firstMessageSent) {
            return !!(firstMessageSent && firstMessageSent < maxHistoryDate);
          })
      ];
    })
    .nodeify(callback);


};

exports.findChatMessagesForTroupeForDateRange = function(troupeId, startDate, endDate) {
  return roomCapabilities.getMaxHistoryMessageDate(troupeId)
    .then(function(maxHistoryDate) {
      var q = persistence.ChatMessage
              .where('toTroupeId', troupeId)
              .where('sent').gte(startDate)
              .where('sent').lte(endDate)
              .sort({ sent: 'asc' });

      return q.execQ()
        .then(function(results) {
          if (maxHistoryDate > startDate) {
            return [[], true];
          }

          return [results, false];
        });
    });
};

exports.findDatesForChatMessages = function(troupeId, callback) {
  return persistence.ChatMessage.aggregateQ([
    { $match: { toTroupeId: mongoUtils.asObjectID(troupeId) } },
    { $project: {
        _id: 0,
        sent: 1
      }
    },
    { $group: {
        _id: 1,
        dates: {
          $addToSet: {
            $add: [
              { $multiply: [{ $year: '$sent' }, 10000] },
              { $multiply: [{ $month: '$sent' }, 100] },
              { $dayOfMonth: '$sent' }
            ]
          }
        }
      }
    },
    { $project: {
        _id: 0,
        dates: 1
      }
    },
    {
      $unwind: "$dates"
    }
  ])
  .then(function(dates) {
    return dates.map(function(d) {
      return moment.utc("" + d.dates,  "YYYYMMDD");
    });
  })
  .nodeify(callback);
};

exports.findDailyChatActivityForRoom = function(troupeId, start, end, callback) {
  return persistence.ChatMessage.aggregateQ([
    { $match: {
        toTroupeId: mongoUtils.asObjectID(troupeId),
        sent: {
          $gte: start,
          $lte: end
        }
      }
    },
    { $project: {
        _id: 0,
        sent: 1
      }
    },
    { $group: {
        _id: {
            $add: [
              { $multiply: [{ $year: '$sent' }, 10000] },
              { $multiply: [{ $month: '$sent' }, 100] },
              { $dayOfMonth: '$sent' }
            ]
        },
        count: {
          $sum: 1
        }
      }
    }

  ])
  .then(function(dates) {
    return dates.reduce(function(memo, value) {
      memo[value._id] = value.count;
      return memo;
    }, {});
  })
  .nodeify(callback);
};
