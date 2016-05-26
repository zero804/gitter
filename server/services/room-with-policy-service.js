'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var _ = require('lodash');
var persistence = require('gitter-web-persistence');
var getMaxTagLength = require('gitter-web-shared/validation/validate-tag').getMaxTagLength;
var secureMethod = require('../utils/secure-method');
var StatusError = require('statuserror');
var Promise = require('bluebird');
var policyFactory = require('gitter-web-permissions/lib/legacy-policy-factory');
var userService = require('./user-service');
var eventService = require('./event-service');
var chatService = require('./chat-service');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var roomMembershipService = require('./room-membership-service');
var roomService = require('./room-service');
var assert = require('assert');
var roomMetaService = require('./room-meta-service');
var processMarkdown = require('../utils/markdown-processor');

var MAX_RAW_TAGS_LENGTH = 200;

/**
 * This could do with a better name
 */
function RoomWithPolicyService(room, user, policy) {
  assert(room, 'Room required');
  assert(policy, 'Policy required');
  this.room = room;
  this.user = user;
  this.policy = policy;
}

function allowStaff() {
  return this.user && this.user.staff;
}

function allowAdmin() {
  return this.policy.canAdmin();
}

function allowJoin() {
  return this.policy.canJoin();
}

/**
 * Allow staff or admins to update the tags for a room
 * @return {Promise} Promise of room
 */
RoomWithPolicyService.prototype.updateTags = secureMethod([allowStaff, allowAdmin], function(tags) {
  var reservedTagTestRegex = (/:/);
  var isStaff = this.user.staff;
  var room = this.room;

  var cleanTags = tags.trim().slice(0, MAX_RAW_TAGS_LENGTH).split(',')
    .filter(function(tag) {
      return !!tag; //
    })
    .map(function(tag) {
      return tag.trim().slice(0, getMaxTagLength(isStaff));
    })
    .filter(function(tag) {
      // staff can do anything
      if(isStaff) {
        return true;
      }
      // Users can only save, non-reserved tags
      if(!reservedTagTestRegex.test(tag)) {
        return true;
      }

      return false;
    });

  // Make sure a normal user doesn't clear out our already existing reserved-word(with colons) tags
  var reservedTags = [];
  if(!isStaff) {
    reservedTags = room.tags
      .filter(function(tag) {
        return reservedTagTestRegex.test(tag);
      });
  }

  room.tags = [].concat(cleanTags, reservedTags);

  return room.save();
});

/**
 * Allow admins to change the topic of a room
 */
RoomWithPolicyService.prototype.updateTopic = secureMethod(allowAdmin, function(topic) {
  var room = this.room;
  room.topic = topic;
  return room.save();
});

/**
 * Allow admins and staff to change the providers for a room
 */
RoomWithPolicyService.prototype.updateProviders = secureMethod([allowStaff, allowAdmin], function(providers) {
  var room = this.room;

  // strictly validate the list of providers
  var filtered = _.uniq(providers.filter(function(provider) {
    // only github is allowed for now
    return (provider === 'github');
  }));

  if (filtered.length) {
    room.providers = filtered;
  } else {
    room.providers = undefined;
  }

  return room.save();
});

/**
 * Allow admins to toggle search indexing on a room
 */
RoomWithPolicyService.prototype.toggleSearchIndexing = secureMethod(allowAdmin, function(bool) {
  var room = this.room;
  room.noindex = bool;

  return room.save();
});

function canBanInRoom(room) {
  if(room.githubType === 'ONETOONE') return false;
  if(room.githubType === 'ORG') return false;
  if(room.security === 'PRIVATE') return false; /* No bans in private rooms */

  return true;
}

/**
 * Ban a user from the room. Caller should ensure admin permissions
 */
RoomWithPolicyService.prototype.banUserFromRoom = secureMethod([allowStaff, allowAdmin], function(username, options) {
  var currentUser = this.user;
  var room = this.room;

  if (!username) throw new StatusError(400, 'Username required');
  if (currentUser.username === username) throw new StatusError(400, 'You cannot ban yourself');
  if (!canBanInRoom(room)) throw new StatusError(400, 'This room does not support banning.');

  return userService.findByUsername(username)
    .then(function(bannedUser) {
      if(!bannedUser) throw new StatusError(404, 'User ' + username + ' not found.');

      var existingBan = _.find(room.bans, function(ban) {
        return mongoUtils.objectIDsEqual(ban.userId, bannedUser._id);
      });

      if(existingBan) return existingBan;

      // Don't allow admins to be banned!
      return policyFactory.createPolicyForRoom(bannedUser, room)
        .then(function(bannedUserPolicy) {
          return bannedUserPolicy.canAdmin();
        })
        .then(function(bannedUserIsAdmin) {
          if (bannedUserIsAdmin) throw new StatusError(403, 'Cannot ban an administrator');
          var ban = room.addUserBan({
            userId: bannedUser._id,
            bannedBy: currentUser._id
          });

          return Promise.all([
              room.save(),
              roomMembershipService.removeRoomMember(room._id, bannedUser._id)
            ])
            .return(ban);
        })
        .tap(function() {
          if (options && options.removeMessages) {
            return chatService.removeAllMessagesForUserIdInRoomId(bannedUser._id, room._id);
          }
        })
        .tap(function() {
          return eventService.newEventToTroupe(room, currentUser,
            "@" + currentUser.username + " banned @" + bannedUser.username,
            {
              service: 'bans',
              event: 'banned',
              bannedUser: bannedUser.username,
              prerendered: true,
              performingUser: currentUser.username
            }, {})
            .catch(function(err) {
              logger.error("Unable to create an event in troupe: " + err, { exception: err });
            });
          });
        });
});

RoomWithPolicyService.prototype.unbanUserFromRoom = secureMethod([allowStaff, allowAdmin], function(bannedUserId) {
    var currentUser = this.user;
    var room = this.room;

    if (!bannedUserId) throw new StatusError(400, 'bannedUserId required');

    return userService.findById(bannedUserId)
      .then(function(bannedUser) {
        if (!bannedUser) throw new StatusError(404);

        /* Does the requesting user have admin rights to this room? */
        return persistence.Troupe.update({
            _id: mongoUtils.asObjectID(room._id)
          }, {
            $pull: {
              bans: {
                userId: bannedUserId
              }
            }
          })
        .exec()
        .tap(function() {
          return eventService.newEventToTroupe(room, currentUser,
            "User @" + currentUser.username + " unbanned @" + bannedUser.username,
            {
              service: 'bans',
              event: 'unbanned',
              bannedUser: bannedUser.username,
              prerendered: true,
              performingUser: currentUser.username
            }, {})
            .catch(function(err) {
              logger.error("Unable to create an event in troupe: " + err, { exception: err });
            });
        });
      })
});

RoomWithPolicyService.prototype.createChannel = secureMethod([allowAdmin], function(options) {
  return roomService.createRoomChannel(this.room, this.user, options);
});

/**
 * User join room
 */
RoomWithPolicyService.prototype.joinRoom = secureMethod([allowJoin], function(options) {
  return roomService.joinRoom(this.room, this.user, options);
});

/**
 *  GET room meta/welcome-message
 */
RoomWithPolicyService.prototype.getRoomWelcomeMessage = secureMethod([allowJoin], function(){
  return roomMetaService.findMetaByTroupeId(this.room.id, 'welcomeMessage');
});

RoomWithPolicyService.prototype.updateRoomWelcomeMessage = secureMethod([allowAdmin], function(welcomeMessage){
  if (!welcomeMessage) throw new StatusError(400);

  return processMarkdown(welcomeMessage)
    .bind(this)
    .then(function(welcomeMessage){
      return roomMetaService.upsertMetaKey(this.room.id, 'welcomeMessage', welcomeMessage)
        .return({ welcomeMessage: welcomeMessage });
    });
});

module.exports = RoomWithPolicyService;
