"use strict";

var env = require('gitter-web-env');
var logger = env.logger;
var nconf = env.config;
var stats = env.stats;
var errorReporter = env.errorReporter;

var appEvents = require('gitter-web-appevents');
var assert = require('assert');
var Promise = require('bluebird');
var request = require('request');
var _ = require('lodash');
var persistence = require('gitter-web-persistence');
var uriLookupService = require("./uri-lookup-service");
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var addInvitePolicyFactory = require('gitter-web-permissions/lib/add-invite-policy-factory');
var userService = require('./user-service');
var troupeService = require('./troupe-service');
var oneToOneRoomService = require('./one-to-one-room-service');
var userDefaultFlagsService = require('./user-default-flags-service');
var validateUri = require('gitter-web-github').GitHubUriValidator;
var validate = require('../utils/validate');
var collections = require('../utils/collections');
var StatusError = require('statuserror');
var emailNotificationService = require('./email-notification-service');
var emailAddressService = require('./email-address-service');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var badger = require('./badger-service');
var userSettingsService = require('./user-settings-service');
var roomSearchService = require('./room-search-service');
var assertJoinRoomChecks = require('./assert-join-room-checks');
var unreadItemService = require('./unread-items');
var debug = require('debug')('gitter:app:room-service');
var roomMembershipService = require('./room-membership-service');
var recentRoomService = require('./recent-room-service');
var badgerEnabled = nconf.get('autoPullRequest:enabled');
var uriResolver = require('./uri-resolver');
var getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');
var userScopes = require('gitter-web-identity/lib/user-scopes');
var groupService = require('gitter-web-groups/lib/group-service');
var securityDescriptorGenerator = require('gitter-web-permissions/lib/security-descriptor-generator');
var securityDescriptorUtils = require('gitter-web-permissions/lib/security-descriptor-utils');
var liveCollections = require('./live-collections');

/**
 * sendJoinStats() sends information to MixPanels about a join_room event
 *
 * user       User
 * room       Troupe
 * tracking   Object - contains stats info
 */
function sendJoinStats(user, room, tracking) {
  stats.event("join_room", {
    userId: user.id,
    source: tracking && tracking.source,
    room_uri: room.uri,
    owner: getOrgNameFromTroupeName(room.uri),
    troupeId: room.id,
    groupId: room.groupId
  });
}

function extendStatusError(statusCode, options) {
  var err = new StatusError(statusCode);
  _.extend(err, options);
  return err;
}

function applyAutoHooksForRepoRoom(user, troupe) {
  validate.expect(user, 'user is required');
  validate.expect(troupe, 'troupe is required');
  validate.expect(securityDescriptorUtils.isType('GH_REPO', troupe), 'Auto hooks can only be used on repo rooms. This room is a '+ troupe.githubType);

  logger.info("Requesting autoconfigured integrations");

  return new Promise(function(resolve, reject) {
    request.post({
      url: nconf.get('webhooks:basepath') + '/troupes/' + troupe.id + '/hooks',
      json: {
        service: 'github',
        endpoint: 'gitter',
        githubToken: user.githubToken || user.githubUserToken,
        autoconfigure: 1,
        repo: troupe.uri /* The URI is also the repo name */
      }
    },
    function(err, resp, body) {
      logger.info("Autoconfiguration of webhooks completed. Success? " + !err);
      if(err) return reject(err);
      resolve(body);
    });
  });

}

function doPostGitHubRoomCreationTasks(troupe, user, options) {
  var uri = troupe.uri;
  if (!user) return; // Can this ever happen?

  // TODO: remove this as it is never set anymore and the new create room API
  // opts itsef into this function rather than out.
  if (options.skipPostCreationSteps) return;

  if (!securityDescriptorUtils.isType('GH_REPO', troupe)) return;

  /* Created here */
  /* TODO: Later we'll need to handle private repos too */
  var hasScope = userScopes.hasGitHubScope(user, "public_repo");
  var hookCreationFailedDueToMissingScope;
  if(hasScope) {
    debug('User has public_repo scope. Will attempt to setup webhooks for this room');

    /* Do this asynchronously */
    applyAutoHooksForRepoRoom(user, troupe)
      .catch(function(err) {
        logger.error("Unable to apply hooks for new room", { exception: err });
        errorReporter(err, { uri: uri, user: user.username }, { module: 'room-service' });
      });
  } else {
    hookCreationFailedDueToMissingScope = true;
  }

  if(securityDescriptorUtils.isPublic(troupe) && badgerEnabled && options.addBadge) {
    /* Do this asynchronously (don't chain the promise) */
    userSettingsService.getUserSettings(user.id, 'badger_optout')
      .then(function(badgerOptOut) {
        // If the user has opted out never send the pull request
        if(badgerOptOut) return;

        // Badgers Go!
        return badger.sendBadgePullRequest(uri, user);
      })
      .catch(function(err) {
        errorReporter(err, { uri: uri, user: user.username }, { module: 'room-service' });
        logger.error('Unable to send pull request for new room', { exception: err });
      });
  }

  return {
    hookCreationFailedDueToMissingScope: hookCreationFailedDueToMissingScope
  };

}

function getOwnerFromRepoFullName(repoName) {
  assert(repoName, 'repoName required');
  var owner = repoName.split('/')[0];
  return owner;
}

/**
 * During communities API migration phase, finds or creates a group for the
 * given uri.
 */
function ensureGroupForGitHubRoom(user, githubType, uri) {
  debug('ensureGroupForGitHubRoom: type=%s uri=%s', githubType, uri);
  var options;
  switch (githubType) {
    case 'REPO':
      options = {
        uri: getOwnerFromRepoFullName(uri),
        obtainAccessFromGitHubRepo: uri
      }
      break;

    case 'ORG':
      options = {
        uri: uri
      }
      break;

    default:
      throw new StatusError(400, 'Cannot create a group for ' + githubType);
  }

  return groupService.migration.ensureGroupForGitHubRoomCreation(user, options);
}

/**
 * Assuming that oneToOne uris have been handled already,
 * Figure out what this troupe is for
 *
 * @returns Promise of [troupe, hasJoinPermission] if the user is able to join/create the troupe
 */
function createRoomForGitHubUri(user, uri, options) {
  debug("createRoomForGitHubUri: %s", uri);

  if(!options) options = {};

  /* From here on we're going to be doing a create */
  return validateUri(user, uri)
    .then(function(githubInfo) {
      debug("GitHub information for %s is %j", uri, githubInfo);

      /* If we can't determine the type, skip it */
      if (!githubInfo) throw new StatusError(404);

      var githubType = githubInfo.type;
      var backendType;

      switch (githubType) {
        case 'ORG':
          backendType = 'GH_ORG';
          break;

        case 'REPO':
          backendType = 'GH_REPO';
          break;

        case 'USER':
          // We got back a user. Since we've managed to get this far,
          // it means that the user is on GitHub but not gitter, so
          // we'll 404
          // In future, it might be worth bring up a page.
          throw new StatusError(404);
      }

      var officialUri = githubInfo.uri;
      var lcUri = officialUri.toLowerCase();
      var security = githubInfo.security || null;
      var githubId = githubInfo.githubId || null;
      var topic = githubInfo.description;

      debug('URI validation %s returned type=%s uri=%s', uri, githubType, officialUri);

      if(!options.ignoreCase &&
        officialUri !== uri &&
        officialUri.toLowerCase() === uri.toLowerCase()) {

        debug('Redirecting client from %s to official uri %s', uri, officialUri);
        throw extendStatusError(301, { path: '/' + officialUri });
      }

      /* Room does not yet exist */
      var policy = policyFactory.getPreCreationPolicyEvaluator(user, backendType, officialUri)
      return policy.canAdmin()
        .bind({
          troupe: null,
          updateExisting: null,
          groupId: null
        })
        .then(function(access) {
          debug('Does the user have access to create room %s? %s', uri, access);

          // If the user is not allowed to create this room, go no further
          if(!access) throw new StatusError(403);

          return ensureGroupForGitHubRoom(user, githubType, officialUri);
        })
        .then(function(group) {
          var groupId = this.groupId = group._id;

          var sd = securityDescriptorGenerator.generate(user, {
            linkPath: officialUri,
            type: 'GH_' + githubType, // GH_USER, GH_ORG or GH_REPO
            externalId: githubId,
            security: githubType === 'ORG' ? 'PRIVATE' : security
          });

          return mongooseUtils.upsert(persistence.Troupe, { lcUri: lcUri }, {
              $setOnInsert: {
                lcUri: lcUri,
                groupId: groupId,
                uri: officialUri,
                githubType: githubType,
                githubId: githubId,
                topic: topic || "",
                security: security,
                dateLastSecurityCheck: new Date(),
                userCount: 0,
                sd: sd
              }
            });
        })
        .tap(function(upsertResult) {
          var troupe = this.troupe = upsertResult[0];
          var updateExisting = this.updateExisting = upsertResult[1];

          /* Next stage - post creation tasks */

          if (updateExisting) return;

          return doPostGitHubRoomCreationTasks(troupe, user, options);
        })
        .then(function(postCreationResults) {
          /* Finally, return the results to the user */
          var troupe = this.troupe;
          var updateExisting = this.updateExisting;
          var hookCreationFailedDueToMissingScope = postCreationResults && postCreationResults.hookCreationFailedDueToMissingScope;

          return {
            troupe: troupe,
            didCreate: !updateExisting,
            hookCreationFailedDueToMissingScope: hookCreationFailedDueToMissingScope
          };
        });

    });
}

/**
 * Grant or remove the users access to a room
 * Makes the troupe reflect the users access to a room
 *
 * Returns true if changes were made
 */
function ensureAccessControl(user, troupe, access) {
  if(access) {
    var flags = userDefaultFlagsService.getDefaultFlagsForUser(user);
    return roomMembershipService.addRoomMember(troupe._id, user._id, flags, troupe.groupId);
  } else {
    return roomMembershipService.removeRoomMember(troupe._id, user._id, troupe.groupId);
  }
}

/**
 * Returns the list of rooms to be displayed for the user. This will
 * include all rooms in which the user is a member and additionally
 * the list of rooms where the user is not a member but has been mentioned.
 */
function findAllRoomsIdsForUserIncludingMentions(userId, callback) {
  return Promise.all([
      unreadItemService.getRoomIdsMentioningUser(userId),
      roomMembershipService.findRoomIdsForUser(userId)
    ])
    .spread(function(mentions, memberships) {
      var hash = collections.hashArray(memberships);
      var nonMemberRooms = [];
      _.each(mentions, function(mentionTroupeId) {
        if (!hash[mentionTroupeId]) {
          hash[mentionTroupeId] = true;
          nonMemberRooms.push(mentionTroupeId);
        }
      });

      return [Object.keys(hash), nonMemberRooms];
    })
    .asCallback(callback);
}

/**
 * Add a user to a room.
 * - If the room does not exist, will create the room if the user has permission
 * - If the room does exist, will add the user to the room if the user has permission
 * - If the user does not have access, will return null
 *
 * @return { troupe: ..., uri: ..., policy: ..., roomMember: ..., accessDenied: ... }
 */
function createRoomByUri(user, uri, options) {
  debug("createRoomByUri %s %s %j", user && user.username, uri, options);

  var userId = user && user.id;
  options = options || {};
  validate.expect(uri, 'uri required');

  /* First off, try use local data to figure out what this url is for */
  return uriResolver(user && user.id, uri, options)
    .then(function (resolved) {
      var resolvedUser = resolved && resolved.user;
      var resolvedTroupe = resolved && resolved.room;
      var resolvedGroup = resolved && resolved.group;

      // We resolved a group. There will never be a room at this URI
      if (resolvedGroup) throw new StatusError(404);

      /* Deal with the case of the anonymous user first */
      if(!user) {
        if(resolvedUser) {
          debug("uriResolver returned user for uri=%s", uri);
          throw new StatusError(401);
        }

        if(resolvedTroupe) {
          debug("uriResolver returned troupe for uri=%s", uri);

          return policyFactory.createPolicyForRoom(user, resolvedTroupe)
            .then(function(policy) {
              return policy.canRead();
            })
            .then(function(viewAccess) {
              if (!viewAccess) throw new StatusError(404);

              return {
                troupe: resolvedTroupe
              };
            });
        }

        throw new StatusError(404);
      }

      // If the Uri Lookup returned a user, do a one-to-one
      if(resolvedUser) {
        if(mongoUtils.objectIDsEqual(resolvedUser.id, userId)) {
          debug("localUriLookup returned own user for uri=%s", uri);
          throw new StatusError(404);
        }

        debug("localUriLookup returned user for uri=%s. Finding or creating one-to-one", uri);

        return oneToOneRoomService.findOrCreateOneToOneRoom(user, resolvedUser._id)
          .spread(function(troupe/*, resolvedUser */) {
            return {
              troupe: troupe
            };
          });
      }

      if (resolvedTroupe) {
        return policyFactory.createPolicyForRoom(user, resolvedTroupe)
          .then(function(policy) {
            return policy.canRead();
          })
          .then(function(access) {
            if (!access) throw new StatusError(403);

            return {
              troupe: resolvedTroupe,
            };
          });

      }

      // The room does not exist, lets attempt to create it
      debug("Room does not exist for uri %s, attempting upsert", uri);
      return createRoomForGitHubUri(user, uri, options)
        .then(function(findOrCreateResult) {
          var troupe = findOrCreateResult.troupe;
          var hookCreationFailedDueToMissingScope = findOrCreateResult.hookCreationFailedDueToMissingScope;
          var didCreate = findOrCreateResult.didCreate;

          if (didCreate) {
            emailNotificationService.createdRoomNotification(user, troupe)  // now the san email to the room', wne
              .catch(function(err) {
                logger.error('Unable to send create room notification: ' + err, { exception: err });
              });

            stats.event("create_room", {
              uri: uri,
              roomId: troupe.id,
              groupId: troupe.groupId,
              userId: user.id,
              roomType: "github-room"
            });
          }

          return ensureAccessControl(user, troupe, true)
            .then(function(userRoomMembershipChanged) {

              // if the user has been granted access to the room, send join stats for the cases of being the owner or just joining the room
              if(userRoomMembershipChanged) {
                /* Note that options.tracking is never sent as a param */
                sendJoinStats(user, troupe, options.tracking);
              }

              return {
                troupe: troupe,
                hookCreationFailedDueToMissingScope: hookCreationFailedDueToMissingScope,
                didCreate: didCreate
              };
            });
        });
    });
}

/**
 * notifyInvitedUser() informs an invited user
 *
 * fromUser       User - the inviter
 * invitedUser    User - the invited user
 * room           Room - the room in context
 * opts           Object - token & others
 *
 * returns        User - the invited user
 */
function notifyInvitedUser(fromUser, invitedUser, room) {

  // get the email address
  return emailAddressService(invitedUser, { attemptDiscovery: true })
    .then(function (emailAddress) {
      var notification;

      if(invitedUser.state === 'REMOVED') {
        stats.event('user_added_removed_user');
        return null; // This has been removed
      }

      if (invitedUser.state === 'INVITED') {
        if (emailAddress) {
          notification = 'email_invite_sent';
          emailNotificationService.sendInvitation(fromUser, invitedUser, room)
            .catch(function(err) {
              logger.error('Unable to send invitation: ' + err, { exception: err });
            });
        } else {
          notification = 'unreachable_for_invite';
        }
      } else {
        emailNotificationService.addedToRoomNotification(fromUser, invitedUser, room)
          .catch(function(err) {
            logger.error('Unable to send added to room notification: ' + err, { exception: err });
          });
        notification = 'email_notification_sent';
      }

      var metrics = {
        notification: notification,
        troupeId: room.id,
        to: invitedUser.username,
        from: fromUser.username,
      };

      stats.event('user_added_someone', _.extend(metrics, { userId: fromUser.id }));
      return null;
    })
    .thenReturn(invitedUser);
}

function updateUserDateAdded(userId, roomId, date) {
  var setOp = {};
  setOp['added.' + roomId] = date || new Date();

  return persistence.UserTroupeLastAccess.update(
     { userId: userId },
     { $set: setOp },
     { upsert: true })
     .exec();

}

/**
 * Adds a user to a room. Please note that the security checks should
 * have already occurred in the caller
 */
function joinRoom(room, user, options) {
  options = options || {};

  if (!room) throw new StatusError(400);

  return assertJoinRoomChecks(room, user)
    .then(function() {
      // We need to add the last access time before adding the member to the room
      // so that the serialized create that the user receives will contain
      // the last access time and not be hidden in the troupe list
      return recentRoomService.saveLastVisitedTroupeforUserId(user._id, room._id, { skipFayeUpdate: true });
    })
    .then(function() {
      var flags = userDefaultFlagsService.getDefaultFlagsForUser(user);

      return roomMembershipService.addRoomMember(room._id, user._id, flags, room.groupId);
    })
    .then(function() {
      sendJoinStats(user, room, options.tracking);
    });
}

/**
 * Somebody adds another user to a room.
 * Caller needs to ensure that the instigatingUser can add
 * the user to the room
 */
function addUserToRoom(room, instigatingUser, userToAdd) {
  assert(userToAdd && userToAdd.username, 'userToAdd required');
  var usernameToAdd = userToAdd.username;

  return addInvitePolicyFactory.createPolicyForRoomAdd(userToAdd, room)
    .then(function(policy) {
      return policy.canJoin();
    })
    .then(function(canJoin) {
      if (!canJoin) throw new StatusError(403, usernameToAdd + ' does not have permission to join this room.');
    })
    .then(function () {
      return assertJoinRoomChecks(room, userToAdd);
    })
    .then(function() {
      // We need to add the last access time before adding the member to the room
      // so that the serialized create that the user receives will contain
      // the last access time and not be hidden in the troupe list
      return recentRoomService.saveLastVisitedTroupeforUserId(userToAdd._id, room._id, { skipFayeUpdate: true });
    })
    .then(function() {
      var flags = userDefaultFlagsService.getDefaultFlagsForUser(userToAdd);
      return roomMembershipService.addRoomMember(room._id, userToAdd._id, flags, room.groupId);
    })
    .then(function(wasAdded) {
      if (!wasAdded) return userToAdd;

      return Promise.all([
        notifyInvitedUser(instigatingUser, userToAdd, room),
        updateUserDateAdded(userToAdd.id, room.id)
      ]);
    })
    .then(function() {
      return userToAdd;
    });
}

/**
 * Remove user from room
 * If the user to be removed is not the one requesting, check permissions
 */
function removeUserFromRoom(room, user) {
  if (!room) throw new StatusError(400, 'Room required');
  if (!user) throw new StatusError(400, 'User required');
  if (room.oneToOne) throw new StatusError(400, 'This room does not support removing.');

  return roomMembershipService.removeRoomMember(room._id, user._id, room.groupId)
    .then(function() {
      // Remove favorites, unread items and last access times
      return recentRoomService.removeRecentRoomForUser(user._id, room._id);
    });
}

function removeRoomMemberById(roomId, userId) {
  return persistence.TroupeUser.findById(roomId, { _id: 0, groupId: 1 })
    .exec()
    .then(function(room) {
      var groupId = room && room.groupId;
      return roomMembershipService.removeRoomMember(roomId, userId, groupId);
    });
}
/**
 * Hides a room for a user.
 */
function hideRoomFromUser(room, userId) {
  assert(room && room.id, 'room parameter required');
  assert(userId, 'userId parameter required');
  var roomId = room.id;

  return recentRoomService.removeRecentRoomForUser(userId, roomId)
    .then(function() {
      return roomMembershipService.getMemberLurkStatus(roomId, userId);
    })
    .then(function(userLurkStatus) {
      if (userLurkStatus === null) {
        // User does not appear to be in the room...
        appEvents.dataChange2('/user/' + userId + '/rooms', 'remove', { id: roomId }, 'room');
        return;
      }

      // TODO: in future get rid of this but this collection is used by the native clients
      appEvents.dataChange2('/user/' + userId + '/rooms', 'patch', {
        id: roomId,
        favourite: null,
        lastAccessTime: null,
        activity: 0,
        mentions: 0,
        unreadItems: 0 }, 'room');

      // If somebody is lurking in a room
      // and the room is not one-to-one
      // remove them from the room
      // See https://github.com/troupe/gitter-webapp/issues/1743

      if (userLurkStatus && !room.oneToOne) {
        return removeRoomMemberById(roomId, userId);
      }

    });
}

/**
 * If the ban is found, returns troupeBan else returns null
 */
function findBanByUsername(troupeId, bannedUsername) {
  return userService.findByUsername(bannedUsername)
    .then(function(user) {
      if (!user) return;

      return persistence.Troupe.findOne({
        _id: mongoUtils.asObjectID(troupeId),
        'bans.userId': user._id },
        { _id: 0, 'bans.$': 1 },
        { lean: true })
        .exec()
        .then(function(troupe) {
          if (!troupe || !troupe.bans || !troupe.bans.length) return;

          return troupe.bans[0];
        });

    });
}

function searchRooms(userId, queryText, options) {

  return persistence.Troupe
    .find({
      'users.userId': userId,
      $or: [{
          'githubType': 'ORG'
        },{
          'security': 'PRIVATE'
      }]
    }, {
      _id: 1
    })
    .exec()
    .then(function(rooms) {
      var privateRoomIds = rooms.map(function(t) {
        return t._id;
      });

      return roomSearchService.searchRooms(queryText, userId, privateRoomIds, options);
    })
    .then(function(roomIds) {
      return troupeService.findByIds(roomIds)
        .then(function(rooms) {
          return collections.maintainIdOrder(roomIds, rooms);
        });
    });
}

/**
 * Delete room
 */
function deleteRoom(troupe) {
  var userListPromise;
  if (troupe.oneToOne) {
    userListPromise = Promise.resolve(troupe.oneToOneUsers.map(function(t) { return t.userId; }));
  } else {
    userListPromise = roomMembershipService.findMembersForRoom(troupe._id);
  }

  return userListPromise
    .then(function(userIds) {
      return Promise.all(userIds.map(function(userId) {
          // Remove favorites, unread items and last access times
          return recentRoomService.removeRecentRoomForUser(userId, troupe._id);
        }))
        .then(function() {
          // Remove all the folk from the room
          return roomMembershipService.removeRoomMembers(troupe._id, userIds, troupe.groupId);
        });
    })
    .then(function() {
      return troupe.remove();
    })
    .then(function() {
      // TODO: NB: remove channel reference from parent room if this is a channel
      return Promise.all([
          persistence.ChatMessage.remove({ toTroupeId: troupe._id }).exec(),
          persistence.Event.remove({ toTroupeId: troupe._id }).exec(),
          // TODO: webhooks
        ]);

    });
}

// This is the new way to add any type of room to a group and should replace
// all the types of room creation except one-to-ones
function createGroupRoom(user, group, roomInfo, securityDescriptor, options) {
  options = options || {}; // options.tracking
  var uri = roomInfo.uri;
  var topic = roomInfo.topic;
  var lcUri = uri.toLowerCase();
  var providers = roomInfo.providers;

  // convert back to the old github-tied vars here
  var type = securityDescriptor.type || null;

  var roomType;
  switch (type) {
    case 'GH_ORG':
      roomType = 'github-room';
      break

    case 'GH_REPO':
      roomType = 'github-room';
      break

    case 'GH_USER':
      roomType = 'github-room';
      break

    case null:
      roomType = 'group-room'; // or channel?
      break;

    default:
      throw new StatusError(400, 'type is not known: ' + type);
  }

  var insertData = {
    groupId: group._id,
    topic: topic || '',
    uri: uri,
    lcUri: lcUri,
    userCount: 0,
    sd: securityDescriptor,
    providers: providers || []
  };

  var room;

  return mongooseUtils.upsert(persistence.Troupe, { lcUri: lcUri }, {
      $setOnInsert: insertData
    })
    .spread(function(_room, updatedExisting) {
      // bind & tap both get too limiting, so just storing room here
      room = _room;
      if (updatedExisting) {
        throw new StatusError(409);
      }
    })
    .then(function() {
      var flags = userDefaultFlagsService.getDefaultFlagsForUser(user);
      return roomMembershipService.addRoomMember(room._id, user._id, flags, group._id);
    })
    .then(function() {
      // Send the created room notification
      emailNotificationService.createdRoomNotification(user, room) // send an email to the room's owner
        .catch(function(err) {
          logger.error('Unable to send create room notification: ' + err, { exception: err });
        });

      sendJoinStats(user, room, options.tracking);

      stats.event("create_room", {
        userId: user._id,
        roomType: roomType
      });

      return uriLookupService.reserveUriForTroupeId(room._id, uri);
    })
    .then(function() {
      if (room.sd.type === 'GH_REPO' && options.runPostGitHubRoomCreationTasks) {
        /*
        This should only ever be true when creating the default room of a
        GH_REPO backed group. Once we move repo room creation over to this API
        endpoint it will be true in those cases as well.
        */
        // options can be addBadge
        return doPostGitHubRoomCreationTasks(room, user, options);
      }
    })
    .then(function(postCreationResults) {
      // mimicking createRoomByUri's response here
      var hookCreationFailedDueToMissingScope = postCreationResults && postCreationResults.hookCreationFailedDueToMissingScope;
      return {
        troupe: room,
        didCreate: true, // would have 409'd otherwise
        hookCreationFailedDueToMissingScope: hookCreationFailedDueToMissingScope
      };
    });
}

function updateTopic(roomId, topic) {
  if (!topic) topic = '';
  if (topic.length > 4096) throw new StatusError(400);
  return persistence.Troupe.findOneAndUpdate(
    { _id: roomId },
    { $set: { topic: topic } })
    .exec()
    .then(function() {
      liveCollections.rooms.emit('patch', roomId, { topic: topic });
      return null;
    });
}

module.exports = {
  applyAutoHooksForRepoRoom: applyAutoHooksForRepoRoom,
  findAllRoomsIdsForUserIncludingMentions: findAllRoomsIdsForUserIncludingMentions,
  createRoomByUri: createRoomByUri,
  joinRoom: Promise.method(joinRoom),
  addUserToRoom: addUserToRoom,
  removeUserFromRoom: Promise.method(removeUserFromRoom),
  removeRoomMemberById: removeRoomMemberById,
  hideRoomFromUser: hideRoomFromUser,
  findBanByUsername: findBanByUsername,
  searchRooms: searchRooms,
  deleteRoom: deleteRoom,
  createGroupRoom: createGroupRoom,
  updateTopic: updateTopic,
  testOnly: {
    updateUserDateAdded: updateUserDateAdded,
    createRoomForGitHubUri: createRoomForGitHubUri,
  }
};
