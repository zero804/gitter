/* eslint complexity: ["error", 14] */

"use strict";

const Promise = require('bluebird');
const _ = require('lodash');
const StatusError = require('statuserror');

const env = require('gitter-web-env');
const stats = env.stats;
const errorReporter = env.errorReporter;
const logger = env.logger.get('chat');

const mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');
const persistence = require('gitter-web-persistence');
const ChatMessage = persistence.ChatMessage;
const ChatMessageBackup = persistence.ChatMessageBackup;
const mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
const securityDescriptorUtils = require('gitter-web-permissions/lib/security-descriptor-utils');
const chatSpamDetection = require('gitter-web-spam-detection/lib/chat-spam-detection');
const collections = require('gitter-web-utils/lib/collections');
const processText = require('gitter-web-text-processor');
const getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');
const groupResolver = require('./group-resolver');
const userService = require('gitter-web-users');
const chatSearchService = require('./chat-search-service');
const unreadItemService = require('gitter-web-unread-items');
const recentRoomService = require('gitter-web-rooms/lib/recent-room-service');
const markdownMajorVersion = require('gitter-markdown-processor').version.split('.')[0];

var useHints = true;

var MAX_CHAT_MESSAGE_LENGTH = 4096;

var CURRENT_META_DATA_VERSION = markdownMajorVersion;

// If you edit this, you need to update the client too.
/* @const */
var MAX_CHAT_EDIT_AGE_SECONDS = 600;

/**
 * Milliseconds considered 'recent'
 */
var RECENT_WINDOW_MILLISECONDS = 60 * 60 * 1000; // 1 hour

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
    return Promise.resolve([]);
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

  var userLookup = mentionUserNames.length ?
                    userService.findByUsernames(mentionUserNames) :
                    [];

  var groupLookup = mentionGroupNames.length ?
                      groupResolver(troupe, user, mentionGroupNames) :
                      [];

  return Promise.join(userLookup, groupLookup, function(users, groups) {
      var notCurrentUserPredicate = excludingUserId(user.id);

      var usersIndexed = collections.indexByProperty(users, 'username');

      // Lookup the userIds for a mention
      return parsedMessage.mentions
        .map(function(mention) {
          if(mention.group) {
            var groupInfo = groups[mention.screenName];
            if (!groupInfo) {
              return null;
            }

            var groupUserIds = groupInfo.userIds || [];

            return {
              screenName: mention.screenName,
              group: true,
              announcement: groupInfo.announcement || undefined,
              userIds: groupUserIds.filter(notCurrentUserPredicate)
            };
          }

          // Not a group mention
          var mentionUser = usersIndexed[mention.screenName];
          var userId = mentionUser && mentionUser.id;

          return {
            screenName: mention.screenName,
            userId: userId
          };
        })
        .filter(function(f) {
          return !!f;
        });
      });
}

/**
 * Create a new chat and return a promise of the chat.
 *
 * NB: it is the callers responsibility to ensure that the user has permission
 * to chat in the room
 */
function newChatMessageToTroupe(troupe, user, data) {
  // Keep this up here, set sent time asap to ensure order
  var sentAt = new Date();

  return Promise.try(function() {
    if(!troupe) throw new StatusError(404, 'Unknown room');

    /* You have to have text */
    if(!data.text && data.text !== "" /* Allow empty strings for now */) throw new StatusError(400, 'Text is required');
    if(data.text.length > MAX_CHAT_MESSAGE_LENGTH) throw new StatusError(400, 'Message exceeds maximum size');

    // TODO: validate message
    return processText(data.text);
  })
  .bind({
    hellbanned: user.hellbanned
  })
  .tap(function(parsedMessage) {
    if (this.hellbanned) {
      return;
    }

    return chatSpamDetection.detect(user, parsedMessage)
      .bind(this)
      .then(function(isSpamming) {
        if (isSpamming) {
          this.hellbanned = true;
        }
      })
  })
  .then(function(parsedMessage) {
    return [parsedMessage, resolveMentions(troupe, user, parsedMessage)];
  })
  .spread(function(parsedMessage, mentions) {
    var isPublic = securityDescriptorUtils.isPublic(troupe);

    var chatMessage = new ChatMessage({
      fromUserId: user.id,
      toTroupeId: troupe.id,
      sent:       sentAt,
      text:       data.text, // Keep the raw message.
      status:     data.status, // Checks if it is a status update
      pub:        isPublic || undefined, // Public room - useful for sampling
      html:       parsedMessage.html,
      lang:       parsedMessage.lang,
      urls:       parsedMessage.urls,
      mentions:   mentions,
      issues:     parsedMessage.issues,
      _md:        parsedMessage.markdownProcessingFailed ? -CURRENT_META_DATA_VERSION : CURRENT_META_DATA_VERSION
    });

    // hellban for users
    // dont write message to db, just fake it for the troll / asshole
    if (this.hellbanned) {
      return chatMessage;
    }

    return chatMessage.save()
      .then(function() {
        var lastAccessTime = mongoUtils.getDateFromObjectId(chatMessage._id);

        recentRoomService.saveLastVisitedTroupeforUserId(user._id, troupe._id, {
            lastAccessTime: lastAccessTime
          })
          .catch(function(err) {
            errorReporter(err, { operation: 'unreadItemService.createChatUnreadItems', chat: chatMessage }, { module: 'chat-service' });
          })
          .done();


        // Async add unread items
        unreadItemService.createChatUnreadItems(user.id, troupe, chatMessage)
          .catch(function(err) {
            errorReporter(err, { operation: 'unreadItemService.createChatUnreadItems', chat: chatMessage }, { module: 'chat-service' });
          })
          .done();

        var statMetadata = _.extend({
          userId: user.id,
          troupeId: troupe.id,
          groupId: troupe.groupId,
          username: user.username,
          room_uri: troupe.uri,
          owner: getOrgNameFromTroupeName(troupe.uri)
        }, data.stats);

        stats.event("new_chat", statMetadata);

        return chatMessage;
      });
  });
}

// Returns some recent public chats
function getRecentPublicChats() {
  var minRecentTime = Date.now() - RECENT_WINDOW_MILLISECONDS;
  var minId = mongoUtils.createIdForTimestamp(minRecentTime);

  var aggregation = [{
    $match: {
      _id: { $gt: minId },
      pub: true
    }
  }, {
    $sample: {
      size: 100
    }
  }, {
    $sort: {
      _id: -1
    }
  }];

  return ChatMessage.aggregate(aggregation)
    .read(mongoReadPrefs.secondaryPreferred)
    .exec();
}

/**
 * NB: It is the callers responsibility to ensure that the user has access to the room!
 */
function updateChatMessage(troupe, chatMessage, user, newText, callback) {
  return Promise.try(function() {
      newText = newText || '';

      var age = (Date.now() - chatMessage.sent.valueOf()) / 1000;
      if(age > MAX_CHAT_EDIT_AGE_SECONDS) {
        throw new StatusError(400, "You can no longer edit this message");
      }

      if(!mongoUtils.objectIDsEqual(chatMessage.toTroupeId, troupe.id)) {
        throw new StatusError(403, "Permission to edit this chat message is denied.");
      }

      if(!mongoUtils.objectIDsEqual(chatMessage.fromUserId, user.id)) {
        throw new StatusError(403, "Permission to edit this chat message is denied.");
      }

      chatMessage.text = newText;
      return processText(newText);
    })
    .then(function(parsedMessage) {
      return Promise.all([parsedMessage, resolveMentions(troupe, user, parsedMessage)]);
    })
    .spread(function(parsedMessage, mentions) {
      chatMessage.html = parsedMessage.html;
      chatMessage.editedAt = new Date();
      chatMessage.lang = parsedMessage.lang;

      // Metadata
      chatMessage.urls = parsedMessage.urls;
      var originalMentions = chatMessage.mentions;
      chatMessage.mentions = mentions;
      chatMessage.issues = parsedMessage.issues;
      chatMessage._md = parsedMessage.markdownProcessingFailed ?
                                -CURRENT_META_DATA_VERSION : CURRENT_META_DATA_VERSION;

      return chatMessage.save()
        .then(function() {
          // Async add unread items
          unreadItemService.updateChatUnreadItems(user.id, troupe, chatMessage, originalMentions)
            .catch(function(err) {
              errorReporter(err, { operation: 'unreadItemService.updateChatUnreadItems', chat: chatMessage }, { module: 'chat-service' });
            });

          stats.event("edit_chat", {
            userId: user.id,
            troupeId: troupe.id,
            username: user.username
          });

          return null;
        })
        .thenReturn(chatMessage);
    })
    .nodeify(callback);
}

function findById(id, callback) {
  return ChatMessage.findById(id)
    .exec()
    .nodeify(callback);
}

function findByIdLean(id, fields) {
  return ChatMessage.findById(id, fields)
    .lean()
    .exec();
}

function findByIdInRoom(troupeId, id, callback) {
  return ChatMessage.findOne({ _id: id, toTroupeId: troupeId })
    .exec()
    .nodeify(callback);
}

/**
 * Returns a promise of chats with given ids
 */
function findByIds(ids, callback) {
  return mongooseUtils.findByIds(ChatMessage, ids, callback);
}

/* This is much more cacheable than searching less than a date */
function getDateOfFirstMessageInRoom(troupeId) {
  return ChatMessage
    .where('toTroupeId', troupeId)
    .limit(1)
    .select({ _id: 0, sent: 1 })
    .sort({ sent: 'asc' })
    .lean()
    .exec()
    .then(function(r) {
      if(!r.length) return null;
      return r[0].sent;
    });
}

function findFirstUnreadMessageId(troupeId, userId) {
  return unreadItemService.getFirstUnreadItem(userId, troupeId);
}

/**
 * Mongo timestamps have a resolution down to the second, whereas
 * sent times have a resolution down to the milliseond.
 * To ensure that there is an overlap, we need to slightly
 * extend the search range using these two functions.
 */
function sentBefore(objectId) {
  return new Date(objectId.getTimestamp().valueOf() + 1000);
}

function sentAfter(objectId) {
  return new Date(objectId.getTimestamp().valueOf() - 1000);
}

/**
 * Returns a promise of messages
 */
function findChatMessagesForTroupe(troupeId, options = {}, callback) {
  var limit = Math.min(options.limit || 50, 100);
  var skip = options.skip || 0;

  if (skip > 5000) {
    return Promise.reject(new StatusError(400, 'Skip is limited to 5000 items. Please use beforeId rather than skip. See https://developer.gitter.im'));
  }

  var findMarker;
  if(options.marker === 'first-unread' && options.userId) {
    findMarker = findFirstUnreadMessageId(troupeId, options.userId);
  } else {
    findMarker = Promise.resolve(null);
  }

  return findMarker
    .then(function(markerId) {
      if(!markerId && !options.aroundId) {
        var q = ChatMessage
          .where('toTroupeId', troupeId);

        var sentOrder = 'desc';

        if(options.beforeId) {
          var beforeId = new ObjectID(options.beforeId);
          // Also add sent as this helps mongo by using the { troupeId, sent } index
          q = q.where('sent').lte(sentBefore(beforeId));
          q = q.where('_id').lt(beforeId);
        }

        if(options.beforeInclId) {
          var beforeInclId = new ObjectID(options.beforeInclId);
          // Also add sent as this helps mongo by using the { troupeId, sent } index
          q = q.where('sent').lte(sentBefore(beforeInclId));
          q = q.where('_id').lte(beforeInclId); // Note: less than *or equal to*
        }

        if(options.afterId) {
          // Reverse the initial order for afterId
          sentOrder = 'asc';

          var afterId = new ObjectID(options.afterId);
          // Also add sent as this helps mongo by using the { troupeId, sent } index
          q = q.where('sent').gte(sentAfter(afterId));
          q = q.where('_id').gt(afterId);
        }

        if (useHints) {
          q.hint({ toTroupeId: 1, sent: -1 });
        }

        q = q.sort(options.sort || { sent: sentOrder })
          .limit(limit);

        if (skip) {
          if (skip > 1000) {
            logger.warn('chat-service: Client requested large skip value on chat message collection query', { troupeId: troupeId, skip: skip });
          }

          q = q.skip(skip);

          if (!options.readPreference) {
            q = q.read(mongoReadPrefs.secondaryPreferred);
          }
        }

        if (options.readPreference) {
          q = q.read(options.readPreference);
        }

        return q.lean()
          .exec()
          .then(function(results) {
            mongooseUtils.addIdToLeanArray(results);

            if(sentOrder === 'desc') {
              results.reverse();
            }

            return results;
          });
      }

      var aroundId = new ObjectID(markerId || options.aroundId);

      var halfLimit = Math.floor(options.limit / 2) || 25;

      var q1 = ChatMessage
                .where('toTroupeId', troupeId)
                .where('sent').lte(sentBefore(aroundId))
                .where('_id').lte(aroundId)
                .sort({ sent: 'desc' })
                .lean()
                .limit(halfLimit);

      var q2 = ChatMessage
                .where('toTroupeId', troupeId)
                .where('sent').gte(sentAfter(aroundId))
                .where('_id').gt(aroundId)
                .sort({ sent: 'asc' })
                .lean()
                .limit(halfLimit);

      if (useHints) {
        q1.hint({ toTroupeId: 1, sent: -1 });
        q2.hint({ toTroupeId: 1, sent: -1 });
      }


      /* Around case */
      return Promise.all([
        q1.exec(),
        q2.exec(),
        ])
        .spread(function(a, b) {
          mongooseUtils.addIdToLeanArray(a);
          mongooseUtils.addIdToLeanArray(b);

          return [].concat(a.reverse(), b);
        });
    })
    .nodeify(callback);


}

function findChatMessagesForTroupeForDateRange(troupeId, startDate, endDate) {
  var q = ChatMessage
          .where('toTroupeId', troupeId)
          .where('sent').gte(startDate)
          .where('sent').lte(endDate)
          .sort({ sent: 'asc' });

  return q.exec();
}

/**
 * Search for messages in a room using a full-text index.
 *
 * Returns promise messages
 */
function searchChatMessagesForRoom(troupeId, textQuery, options) {
  return chatSearchService.searchChatMessagesForRoom(troupeId, textQuery, options)
    .then(function(searchResults) {
      // We need to maintain the order of the original results
      if(searchResults.length === 0) return [];

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

          return chatsOrdered;
        });
    });
}

function deleteMessage(message) {
  // `_.omit` because of `Cannot update '__v' and '__v' at the same time` error
  return mongooseUtils.upsert(ChatMessageBackup, { _id: message._id }, _.omit(message.toObject(), '__v'))
    .then(() => {
      message.remove();
    });
}

function removeAllMessagesForUserIdInRoomId(userId, roomId) {
  return ChatMessage.find({ toTroupeId: roomId, fromUserId: userId })
    .exec()
    .then(function(messages) {
      return Promise.map(messages, (message) => deleteMessage(message), { concurrency: 1 });
    });
}

function deleteMessageFromRoom(troupe, chatMessage) {
  return unreadItemService.removeItem(chatMessage.fromUserId, troupe, chatMessage)
    .then(() => deleteMessage(chatMessage))
    .return(null);
}


const testOnly = {
  setUseHints: function(value) {
    useHints = value;
  }
};

module.exports = {
  newChatMessageToTroupe,
  getRecentPublicChats,
  updateChatMessage,
  findById,
  findByIdLean,
  findByIdInRoom,
  findByIds,
  getDateOfFirstMessageInRoom,
  findChatMessagesForTroupe,
  findChatMessagesForTroupeForDateRange,
  searchChatMessagesForRoom,
  removeAllMessagesForUserIdInRoomId,
  deleteMessageFromRoom,
  testOnly
};
