"use strict";

var env                  = require('../utils/env');
var stats                = env.stats;
var config               = env.config;
var errorReporter        = env.errorReporter;

var ChatMessage          = require("./persistence-service").ChatMessage;
var collections          = require("../utils/collections");
var troupeService        = require("./troupe-service");
var userService          = require("./user-service");
var processChat          = require('../utils/markdown-processor');
var appEvents            = require('../app-events');
var Q                    = require('q');
var mongoUtils           = require('../utils/mongo-utils');
var moment               = require('moment');
var roomCapabilities     = require('./room-capabilities');
var StatusError          = require('statuserror');
var unreadItemService    = require('./unread-item-service');
var _                    = require('underscore');
var mongooseUtils        = require('../utils/mongoose-utils');
var cacheWrapper         = require('../utils/cache-wrapper');
var groupResolver        = require('./group-resolver');
var chatSearchService    = require('./chat-search-service');
var unreadItemService    = require('./unread-item-service');
var markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];

/*
 * Hey Trouper!
 * This is a changelog of sorts for changes to message processing & metadata.
 * Since version 7, processing is done by a seperate (versioned) module.
 * so check github.com/gitterHQ/gitter-markdown-processor to see what changes at every major version
 */
var VERSION_SWITCH_TO_SERVER_SIDE_RENDERING = 5;
var VERSION_KATEX = 6;
var VERSION_EXTERNAL_GITTER_MARKDOWN_PROCESSOR = 7;

var MAX_CHAT_MESSAGE_LENGTH = 4096;

var CURRENT_META_DATA_VERSION = markdownMajorVersion;

// If you edit this, you need to update the client too.
/* @const */
var MAX_CHAT_EDIT_AGE_SECONDS = 600;

var ObjectID = require('mongodb').ObjectID;


function excludingUserId(userId) {
  userId = String(userId);
  return function(u) {
    return String(u) !== userId;
  };
}

/* Resolve userIds for mentions */
function resolveMentions(troupe, user, parsedMessage) {
  if (!parsedMessage.mentions || !parsedMessage.mentions.length) {
    return Q.resolve([]);
  }

  /* Look through the mentions and attempt to tie the mentions to userIds */
  var mentionUserNames = parsedMessage.mentions
    .filter(function(m) {
      return !m.group;
    })
    .map(function(mention) {
      return mention.screenName;
    });

  var mentionGroupNames = parsedMessage.mentions
    .filter(function(m) {
      return m.group;
    })
    .map(function(mention) {
      return mention.screenName;
    });

  return Q.all([
      mentionUserNames.length ? userService.findByUsernames(mentionUserNames) : [],
      mentionGroupNames.length ? groupResolver(troupe, user, mentionGroupNames) : []
    ])
    .spread(function(users, groups) {
      var notCurrentUserPredicate = excludingUserId(user.id);

      var usersIndexed = collections.indexByProperty(users, 'username');

      // Lookup the userIds for a mention
      return parsedMessage.mentions
        .map(function(mention) {
          if(mention.group) {
            var groupUserIds = groups[mention.screenName] || [];

            groupUserIds = groupUserIds.filter(notCurrentUserPredicate);

            return {
              screenName: mention.screenName,
              group: true,
              userIds: groupUserIds
            };

          }

          // Not a group mention
          var mentionUser = usersIndexed[mention.screenName];
          var userId = mentionUser && mentionUser.id;

          return {
            screenName: mention.screenName,
            userId: userId
          };
        });
      });
}

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
    return [parsedMessage, resolveMentions(troupe, user, parsedMessage)];
  })
  .spread(function(parsedMessage, mentions) {
    var chatMessage = new ChatMessage({
      fromUserId: user.id,
      toTroupeId: troupe.id,
      sent:       new Date(),
      text:       data.text,                    // Keep the raw message.
      status:     data.status,                // Checks if it is a status update
      pub:        troupe.security === 'PUBLIC' || undefined, // Public room - useful for sampling
      html:       parsedMessage.html,
      lang:       parsedMessage.lang,
      urls:       parsedMessage.urls,
      mentions:   mentions,
      issues:     parsedMessage.issues,
      _md:        parsedMessage.markdownProcessingFailed ? -CURRENT_META_DATA_VERSION : CURRENT_META_DATA_VERSION
    });

    return chatMessage.saveQ()
      .then(function() {
        // Async add unread items
        unreadItemService.createChatUnreadItems(user.id, troupe, chatMessage)
          .catch(function(err) {
            errorReporter(err, { operation: 'unreadItemService.createChatUnreadItems', chat: chatMessage });
          });

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
  })
  .nodeify(callback);
};

// Returns some recent public chats
exports.getRecentPublicChats = function() {
  var twentyFourHoursAgo = new Date(Date.now() - 86400000);

  return ChatMessage
            .where({ pub: true })
            .where({ sent: { $gt: twentyFourHoursAgo} })
            .sort({ _id: -1 })
            .limit(100)
            .execQ();

};

exports.updateChatMessage = function(troupe, chatMessage, user, newText, callback) {
  return Q.fcall(function() {
      var age = (Date.now() - chatMessage.sent.valueOf()) / 1000;
      if(age > MAX_CHAT_EDIT_AGE_SECONDS) {
        throw new StatusError(400, "You can no longer edit this message");
      }

      if(chatMessage.toTroupeId != troupe.id) {
        throw new StatusError(403, "Permission to edit this chat message is denied.");
      }

      if(chatMessage.fromUserId != user.id) {
        throw new StatusError(403, "Permission to edit this chat message is denied.");
      }

      // If the user has been kicked out of the troupe...
      if(!troupeService.userHasAccessToTroupe(user, troupe)) {
        throw new StatusError(403, "Permission to edit this chat message is denied.");
      }

      chatMessage.text = newText;
      return processChat(newText);
    })
    .then(function(parsedMessage) {
      return [parsedMessage, resolveMentions(troupe, user, parsedMessage)];
    })
    .spread(function(parsedMessage, mentions) {
      chatMessage.html      = parsedMessage.html;
      chatMessage.editedAt  = new Date();
      chatMessage.lang      = parsedMessage.lang;

      // Metadata
      chatMessage.urls      = parsedMessage.urls;
      var originalMentions  = chatMessage.mentions;
      chatMessage.mentions  = mentions;
      chatMessage.issues    = parsedMessage.issues;
      chatMessage._md       = parsedMessage.markdownProcessingFailed ?
                                -CURRENT_META_DATA_VERSION : CURRENT_META_DATA_VERSION;

      return chatMessage.saveQ()
        .then(function() {
          // Async add unread items
          unreadItemService.updateChatUnreadItems(user.id, troupe, chatMessage, originalMentions)
            .catch(function(err) {
              errorReporter(err, { operation: 'unreadItemService.updateChatUnreadItems', chat: chatMessage });
            });
        })
        .thenResolve(chatMessage);
    })
    .nodeify(callback);
};

exports.findById = function(id, callback) {
  return ChatMessage.findByIdQ(id)
    .nodeify(callback);
};

exports.findByIdInRoom = function(troupeId, id, callback) {
  return ChatMessage.findOneQ({ _id: id, toTroupeId: troupeId })
    .nodeify(callback);
};

/**
 * Returns a promise of chats with given ids
 */
function findByIds(ids, callback) {
  return mongooseUtils.findByIds(ChatMessage, ids, callback);
}
exports.findByIds = findByIds;

/* This is much more cacheable than searching less than a date */
function getDateOfFirstMessageInRoom(troupeId) {
  return ChatMessage
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

/*
 * this does a massive query, so it has to be cached for a long time
 */
exports.getRoughMessageCount = cacheWrapper('getRoughMessageCount', function(troupeId) {
  return ChatMessage.countQ({ toTroupeId: troupeId });
}, {
  ttl: config.get('chat-service:get-rough-message-count-cache-timeout')
});

function findFirstUnreadMessageId(troupeId, userId) {
  return unreadItemService.getFirstUnreadItem(userId, troupeId);
}

function historyForTroupeExceedsDate(troupeId, maxHistoryDate) {
  return getDateOfFirstMessageInRoom(troupeId)
    .then(function(firstMessageSent) {
      return !!(firstMessageSent && firstMessageSent < maxHistoryDate);
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

  var limit = options.limit || 50;
  var skip = options.skip || 0;

  return Q.all([
      roomCapabilities.getMaxHistoryMessageDate(troupeId),
      findMarker
    ])
    .spread(function(maxHistoryDate, markerId) {
      if(!markerId && !options.aroundId) {
        var q = ChatMessage
          .where('toTroupeId', troupeId);

        var sentOrder = 'desc';

        if(options.beforeId) {
          var beforeId = new ObjectID(options.beforeId);
          q = q.where('_id').lt(beforeId);
        }

        if(options.beforeInclId) {
          var beforeInclId = new ObjectID(options.beforeInclId);
          q = q.where('_id').lte(beforeInclId); // Note: less than *or equal to*
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

        return q.sort(options.sort || { sent: sentOrder })
          .limit(limit)
          .skip(skip)
          .execQ()
          .then(function(results) {
            var limitReached = false;

            if(sentOrder === 'desc') {
              results.reverse();
              if(maxHistoryDate && results.length < limit) {
                limitReached = historyForTroupeExceedsDate(troupeId, maxHistoryDate);
              }
            }

            return [results, limitReached];
          });
      }

      var aroundId = new ObjectID(markerId || options.aroundId);

      var halfLimit = Math.floor(options.limit / 2) || 25;

      var q1 = ChatMessage
                .where('toTroupeId', troupeId)
                .sort({ sent: 'desc' })
                .limit(halfLimit)
                .where('_id').lte(aroundId);

      var q2 = ChatMessage
                .where('toTroupeId', troupeId)
                .sort({ sent: 'asc' })
                .limit(halfLimit)
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
          var limitReached = false;

          // Got back less results than we were expecting?
          if(maxHistoryDate && a.length < halfLimit) {
            limitReached = historyForTroupeExceedsDate(troupeId, maxHistoryDate);
          }

          return [[].concat(a.reverse(), b), limitReached];
        });
    })
    .nodeify(callback);


};

exports.findChatMessagesForTroupeForDateRange = function(troupeId, startDate, endDate) {
  return roomCapabilities.getMaxHistoryMessageDate(troupeId)
    .then(function(maxHistoryDate) {
      var q = ChatMessage
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
  return ChatMessage.aggregateQ([
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
  return ChatMessage.aggregateQ([
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

/**
 * Search for messages in a room using a full-text index.
 *
 * Returns promise [messages, limitReached]
 */
exports.searchChatMessagesForRoom = function(troupeId, textQuery, options) {
  return chatSearchService.searchChatMessagesForRoom(troupeId, textQuery, options)
    .spread(function(searchResults, limitReached) {
      // We need to maintain the order of the original results
      if(searchResults.length === 0) return [[], limitReached];

      var ids = searchResults.map(function(result) {
        return result.id;
      });


      return findByIds(ids)
        .then(function(chats) {
          // Keep the order the same as the original search results
          var chatsIndexed = collections.indexById(chats);
          var chatsOrdered = searchResults
            .map(function(result) {
              var chat = chatsIndexed[result.id];
              if(chat) {
                chat.highlights = result.highlights;
              }
              return chat;
            })
            .filter(function(f) {
              return !!f;
            });

          return [chatsOrdered, limitReached];
        });
    });
};
