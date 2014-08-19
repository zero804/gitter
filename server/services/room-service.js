/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env                = require('../utils/env');
var logger             = env.logger;
var nconf              = env.config;
var stats              = env.stats;

var ObjectID           = require('mongodb').ObjectID;
var Q                  = require('q');
var request            = require('request');
var _                  = require('underscore');
var xregexp            = require('xregexp').XRegExp;
var persistence        = require('./persistence-service');
var validateUri        = require('./github/github-uri-validator');
var uriLookupService   = require("./uri-lookup-service");
var permissionsModel   = require('./permissions-model');
var roomPermissionsModel = require('./room-permissions-model');
var userService        = require('./user-service');
var troupeService      = require('./troupe-service');
var GitHubRepoService  = require('./github/github-repo-service');
var unreadItemService  = require('./unread-item-service');
var appEvents          = require("../app-events");
var serializeEvent     = require('./persistence-service-events').serializeEvent;
var validate           = require('../utils/validate');
var collections        = require('../utils/collections');
var StatusError        = require('statuserror');
var eventService       = require('./event-service');
var emailNotificationService = require('./email-notification-service');
var canUserBeInvitedToJoinRoom = require('./invited-permissions-service');
var emailAddressService = require('./email-address-service');

function localUriLookup(uri, opts) {
  return uriLookupService.lookupUri(uri)
    .then(function(uriLookup) {
      if(!uriLookup) return null;

      if(uriLookup.userId) {
        return userService.findById(uriLookup.userId)
          .then(function(user) {
            if(!user) {
              logger.info('Removing stale uri: ' + uri + ' from URI lookups');

              return uriLookupService.removeBadUri(uri)
                                      .thenResolve(null);
            }

            if(!opts.ignoreCase &&
                user.username != uri &&
                user.username.toLowerCase() === uri.toLowerCase()) {
              logger.info('Incorrect case for room: ' + uri + ' redirecting to ' + user.username);
              throw { redirect: '/' + user.username };
            }

            return { user: user };
          });
      }

      if(uriLookup.troupeId) {
        return troupeService.findById(uriLookup.troupeId)
          .then(function(troupe) {
            if(!troupe) {
              logger.info('Removing stale uri: ' + uri + ' from URI lookups');

              return uriLookupService.removeBadUri(uri)
                                      .thenResolve(null);
            }

            if(!opts.ignoreCase &&
                troupe.uri != uri &&
                troupe.uri.toLowerCase() === uri.toLowerCase()) {
              logger.info('Incorrect case for room: ' + uri + ' redirecting to ' + troupe.uri);
              throw { redirect: '/' + troupe.uri };
            }

            return { troupe: troupe };
          });
      }

      return null;
    });
}

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
    room_uri: room.uri
  });
}

function applyAutoHooksForRepoRoom(user, troupe) {
  validate.expect(user, 'user is required');
  validate.expect(troupe, 'troupe is required');
  validate.expect(troupe.githubType === 'REPO', 'Auto hooks can only be used on repo rooms. This room is a '+ troupe.githubType);

  logger.info("Requesting autoconfigured integrations");

  var d = Q.defer();

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
    if(err) return d.reject(err);
    d.resolve(body);
  });

  return d.promise;
}
exports.applyAutoHooksForRepoRoom = applyAutoHooksForRepoRoom;


/**
 * Private method to push creates out to the bus
 */
function serializeCreateEvent(troupe) {
  var urls = troupe.users.map(function(troupeUser) { return '/user/' + troupeUser.userId + '/rooms'; });
  serializeEvent(urls, 'create', troupe);
}

/**
 * Assuming that oneToOne uris have been handled already,
 * Figure out what this troupe is for
 *
 * @returns Promise of a troupe if the user is able to join/create the troupe
 */
function findOrCreateNonOneToOneRoom(user, troupe, uri, options) {
  if(!options) options = {};

  if(troupe) {
    logger.verbose('Does user ' + (user && user.username || '~anon~') + ' have access to ' + uri + '?');

    return Q.all([
        troupe,
        roomPermissionsModel(user, 'join', troupe)
      ]);
  }

  var lcUri = uri.toLowerCase();

  /* From here on we're going to be doing a create */
  return validateUri(user, uri)
    .spread(function(githubType, officialUri, topic) {

      logger.verbose('URI validation ' + uri + ' returned ', { type: githubType, uri: officialUri });

      /* If we can't determine the type, skip it */
      if(!githubType) return [null, false];

      if(!options.ignoreCase &&
        officialUri !== uri &&
        officialUri.toLowerCase() === uri.toLowerCase()) {

        logger.verbose('Redirecting client from ' + uri + ' to official uri ' + officialUri);

        throw { redirect: '/' + officialUri };
      }

      logger.verbose('Checking if user has permission to create a room at ' + uri);

      /* Room does not yet exist */
      return permissionsModel(user, 'create', officialUri, githubType, null) // Parent rooms always have security == null
        .then(function(access) {
          if(!access) return [null, access];

          var securityPromise;
          if(githubType === 'REPO') {
            var repoService = new GitHubRepoService(user);
            securityPromise = repoService.getRepo(uri)
              .then(function(repoInfo) {
                if(!repoInfo) throw new Error('Unable to find repo ' + uri);

                var security = repoInfo.private ? 'PRIVATE' : 'PUBLIC';
                return security;
              });

          } else {
            securityPromise = Q.resolve(null);
          }

          /* This will load a cached copy */
          return securityPromise.then(function(security) {
              var nonce = Math.floor(Math.random() * 100000);

              return persistence.Troupe.findOneAndUpdateQ(
                { lcUri: lcUri, githubType: githubType },
                {
                  $setOnInsert: {
                    lcUri: lcUri,
                    uri: officialUri,
                    _nonce: nonce,
                    githubType: githubType,
                    topic: topic || "",
                    security: security,
                    dateLastSecurityCheck: new Date(),
                    users:  user ? [{
                      _id: new ObjectID(),
                      userId: user._id
                    }] : []
                  }
                },
                {
                  upsert: true
                })
                .then(function(troupe) {
                  var hookCreationFailedDueToMissingScope;
                  
                  if(nonce == troupe._nonce) {
                    serializeCreateEvent(troupe);

                    /* Created here */
                    var requiredScope = "public_repo";
                    /* TODO: Later we'll need to handle private repos too */
                    var hasScope = user.hasGitHubScope(requiredScope);

                    if(hasScope) {
                      logger.verbose('Upgrading requirements');

                      if(githubType === 'REPO') {
                        /* Do this asynchronously */
                        applyAutoHooksForRepoRoom(user, troupe)
                          .catch(function(err) {
                            logger.error("Unable to apply hooks for new room", { exception: err });
                          });
                      }

                    } else {
                      if(githubType === 'REPO') {
                        logger.verbose('Skipping hook creation. User does not have permissions');
                        hookCreationFailedDueToMissingScope = true;
                      }
                    }
                  }

                  return [troupe, true, hookCreationFailedDueToMissingScope, true];
                });

            });
        });
    });
}

function determineDefaultNotifyForRoom(user, troupe) {
  var repoService = new GitHubRepoService(user);
  return repoService.getRepo(troupe.uri)
    .then(function(repoInfo) {
      if(!repoInfo || !repoInfo.permissions) return 0;

      /* Admin or push? Notify */
      return repoInfo.permissions.admin || repoInfo.permissions.push ? 1 : 0;
    });
}
/**
 * Grant or remove the users access to a room
 * Makes the troupe reflect the users access to a room
 */
function ensureAccessControl(user, troupe, access) {
  if(troupe) {
    if(access) {
      /* In troupe? */
      if(troupe.containsUserId(user.id)) return Q.resolve(troupe);

      troupe.addUserById(user.id);

      // IRC -- these should be centralised - in troupe.addUserById perhaps?
      appEvents.userJoined({user: user, room: troupe});

      return troupe.saveQ().thenResolve(troupe);

    } else {
      /* No access */
      if(!troupe.containsUserId(user.id)) return Q.resolve(null);

      troupe.removeUserById(user.id);

      // IRC -- these should be centralised - in troupe.addUserById perhaps?
      appEvents.userLeft({user: user, room: troupe});

      return troupe.saveQ().thenResolve(null);
    }
  }

  return Q.resolve(null);
}


function findAllRoomsIdsForUserIncludingMentions(userId, callback) {
  return Q.all([
      unreadItemService.getRoomIdsMentioningUser(userId),
      troupeService.findAllTroupesIdsForUser(userId)
    ])
    .spread(function(mentions, memberships) {
      return _.uniq(mentions.concat(memberships));
    })
    .nodeify(callback);
}
exports.findAllRoomsIdsForUserIncludingMentions = findAllRoomsIdsForUserIncludingMentions;

/**
 * Add a user to a room.
 * - If the room does not exist, will create the room if the user has permission
 * - If the room does exist, will add the user to the room if the user has permission
 * - If the user does not have access, will return null
 *
 * @return The promise of a troupe or nothing.
 */
function findOrCreateRoom(user, uri, options) {
  if(!options) options = {};
  validate.expect(uri, 'uri required');

  var userId = user && user.id;

  /* First off, try use local data to figure out what this url is for */
  return localUriLookup(uri, options)
    .then(function(uriLookup) {
      logger.verbose('URI Lookup returned ', { uri: uri, isUser: !!(uriLookup && uriLookup.user), isTroupe: !!(uriLookup && uriLookup.troupe) });

      /* Deal with the case of the nonloggedin user first */
      if(!user) {
        if(!uriLookup) return null;

        if(uriLookup.user) {
          // TODO: figure out what we do for nonloggedin users viewing
          // user profiles
        }

        if(uriLookup.troupe) {
          return roomPermissionsModel(null, 'view', uriLookup.troupe)
            .then(function(access) {
              if(!access) return;

              return { troupe: uriLookup.troupe };
            });
        }

        return null;
      }

      /* Lookup found a user? */
      if(uriLookup && uriLookup.user) {
        var otherUser = uriLookup.user;

        if(otherUser.id == userId) {
          logger.verbose('URI Lookup is our own');

          return { ownUrl: true };
        }

        logger.verbose('Finding or creating a one to one chat');

        return permissionsModel(user, 'view', otherUser.username, 'ONETOONE', null)
          .then(function(access) {
            if(!access) return null;

            return troupeService.findOrCreateOneToOneTroupeIfPossible(userId, otherUser.id)
              .spread(function(troupe, otherUser) {
                return { oneToOne: true, troupe: troupe, otherUser: otherUser };
              });
          });

      }

      logger.verbose('Attempting to access room ' + uri);

      /* Didn't find a user, but we may have found another room */
      return findOrCreateNonOneToOneRoom(user, uriLookup && uriLookup.troupe, uri, options)
        .spread(function (troupe, access, hookCreationFailedDueToMissingScope, didCreate) {
          // if the user has been granted access to the room, send join stats for the cases of being the owner or just joining the room
          if(access && (didCreate || !troupe.containsUserId(user.id))) {
            sendJoinStats(user, troupe, options.tracking);
          }
          
          if (access && didCreate) {
            emailNotificationService.createdRoomNotification(user, troupe);  // now the san email to the room', wne
          }
           
          return ensureAccessControl(user, troupe, access)
            .then(function(troupe) {
              return { oneToOne: false, troupe: troupe, hookCreationFailedDueToMissingScope: hookCreationFailedDueToMissingScope, didCreate: didCreate };
            });
        });
    })
    .then(function(uriLookup) {
      if(uriLookup) {
        uriLookup.uri = uri;
        if(uriLookup.didCreate) {
          stats.event("create_room", {
            userId: user.id,
            roomType: "github-room"
          });
        }
      }

      return uriLookup;
    });
}

exports.findOrCreateRoom = findOrCreateRoom;

/**
 * Find all non-private channels under a particular parent
 */
function findAllChannelsForRoom(user, parentTroupe, callback) {
  return persistence.Troupe.findQ({
      parentId: parentTroupe._id,
      $or: [
        { security: { $ne: 'PRIVATE' } }, // Not private...
        { 'users.userId': user._id },     // ... or you're in the circle of trust
      ]
    })
    .nodeify(callback);
}
exports.findAllChannelsForRoom = findAllChannelsForRoom;

/**
 * Given parent and child ids, find a child channel that is
 * not PRIVATE
 */
function findChildChannelRoom(user, parentTroupe, childTroupeId, callback) {
  return persistence.Troupe.findOneQ({
      parentId: parentTroupe._id,
      id: childTroupeId,
      $or: [
        { security: { $ne: 'PRIVATE' } }, // Not private...
        { 'users.userId': user._id },     // ... or you're in the circle of trust
      ]
    })
    .nodeify(callback);
}
exports.findChildChannelRoom = findChildChannelRoom;

/**
 * Find all non-private channels under a particular parent
 */
function findAllChannelsForUser(user, callback) {
  return persistence.Troupe.findQ({
      ownerUserId: user._id
    })
    .nodeify(callback);
}
exports.findAllChannelsForUser = findAllChannelsForUser;


/**
 * Given parent and child ids, find a child channel that is
 * not PRIVATE
 */
function findUsersChannelRoom(user, childTroupeId, callback) {
  return persistence.Troupe.findOneQ({
      ownerUserId: user._id,
      id: childTroupeId
      /* Dont filter private as owner can see all private rooms */
    })
    .nodeify(callback);
}
exports.findUsersChannelRoom = findUsersChannelRoom;




function assertValidName(name) {
  var matcher = xregexp('^[\\p{L}\\d][\\p{L}\\d\\-\\_]*$');
  if(!matcher.test(name)) {
    throw {
      responseStatusCode: 400,
      clientDetail: {
        illegalName: true
      }
    };
  }
}

var RANGE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgihjklmnopqrstuvwxyz01234567890';
function generateRandomName() {
  var s = '';
  for(var i = 0; i < 6; i++) {
    s += RANGE.charAt(Math.floor(Math.random() * RANGE.length));
  }
  return s;
}

function notValidGithubRepoName(repoName) {
  return (/^[\w\-]{1,}$/).test(repoName);
}

function ensureNoRepoNameClash(user, uri) {
  var parts = uri.split('/');

  if(parts.length < 2) {
    /* The classic "this should never happen" gag */
    throw "Bad channel uri";
  }

  if(parts.length == 2) {
    /* If the name is non-valid in github land, it's safe to use it here */
    if(!notValidGithubRepoName(parts[1])) {
      return false;
    }

    var repoService = new GitHubRepoService(user);
    return repoService.getRepo(uri)
      .then(function(repo) {
        /* Result? Then we have a clash */
        return !!repo;
      });
  }

  // Cant clash with /x/y/z
  return false;
}

function ensureNoExistingChannelNameClash(uri) {
  return troupeService.findByUri(uri)
    .then(function(troupe) {
      return !!troupe;
    });
}

function createCustomChildRoom(parentTroupe, user, options, callback) {
  return Q.fcall(function() {
    validate.expect(user, 'user is expected');
    validate.expect(options, 'options is expected');

    var name = options.name;
    var security = options.security;
    var uri, githubType;

    if(parentTroupe) {
      assertValidName(name);
      uri = parentTroupe.uri + '/' + name;

      if(!{ ORG: 1, REPO: 1 }.hasOwnProperty(parentTroupe.githubType) ) {
        validate.fail('Invalid security option: ' + security);
      }

      switch(parentTroupe.githubType) {
        case 'ORG':
          githubType = 'ORG_CHANNEL';
          break;
        case 'REPO':
          githubType = 'REPO_CHANNEL';
          break;
        default:
          validate.fail('Invalid parent room type');
      }

      if(!{ PUBLIC: 1, PRIVATE: 1, INHERITED: 1 }.hasOwnProperty(security) ) {
        validate.fail('Invalid security option: ' + security);
      }

    } else {
      githubType = 'USER_CHANNEL';

      // Create a child room for a user
      switch(security) {
        case 'PUBLIC':
          assertValidName(name);
          break;

        case 'PRIVATE':
          if(name) {
            /* If you cannot afford a name, one will be assigned to you */
            assertValidName(name);
          } else {
            name = generateRandomName();
          }
          break;

        default:
          validate.fail('Invalid security option: ' + security);
      }

      uri = user.username + '/' + name;

    }

    var lcUri = uri.toLowerCase();
    return permissionsModel(user, 'create', uri, githubType, security)
      .then(function(access) {
        if(!access) throw new StatusError(403, 'You do not have permission to create a channel here');
        // Make sure that no such repo exists on Github
        return ensureNoRepoNameClash(user, uri);
      })
      .then(function(clash) {
        if(clash) throw new StatusError(409, 'There is a repo at ' + uri + ' therefore you cannot create a channel there');
        return ensureNoExistingChannelNameClash(uri);
      })
      .then(function(clash) {
        if(clash) throw new StatusError(409, 'There is already a channel at ' + uri);

        var nonce = Math.floor(Math.random() * 100000);

        return persistence.Troupe.findOneAndUpdateQ(
          { lcUri: lcUri, githubType: githubType },
          {
            $setOnInsert: {
              lcUri: lcUri,
              uri: uri,
              security: security,
              name: name,
              parentId: parentTroupe && parentTroupe._id,
              ownerUserId: parentTroupe ? null : user._id,
              _nonce: nonce,
              githubType: githubType,
              users:  user ? [{ _id: new ObjectID(), userId: user._id }] : []
            }
          },
          {
            upsert: true
          })
          .then(function (newRoom) {
            
            emailNotificationService.createdRoomNotification(user, newRoom); // send an email to the room's owner
            sendJoinStats(user, newRoom, options.tracking); // now the channel has now been created, send join stats for owner joining
            
            // TODO handle adding the user in the event that they didn't create the room!
            if(newRoom._nonce === nonce) {
              serializeCreateEvent(newRoom);
              stats.event("create_room", {
                userId: user.id,
                roomType: "channel"
              });
              return uriLookupService.reserveUriForTroupeId(newRoom._id, uri)
                .thenResolve(newRoom);
            }

            /* Somehow someone beat us to it */
            throw 409;
          });
      });

   })
  .nodeify(callback);
}
exports.createCustomChildRoom = createCustomChildRoom;

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
function notifyInvitedUser(fromUser, invitedUser, room, isNewUser) {
  // get the email address
  return emailAddressService(invitedUser)
    .then(function (emailAddress) {
      var notification;

      if (invitedUser.state === 'INVITED') {
        if (emailAddress) {
          notification = 'email_invite_sent';
          emailNotificationService.sendInvitation(fromUser, invitedUser, room);
        } else {
          notification = 'unreachable_for_invite';
        }
      } else {
        emailNotificationService.addedToRoomNotification(fromUser, invitedUser, room);
        notification = 'email_notification_sent';
      }

      var metrics = {
        notification: notification,
        troupeId: room.id,
        to: invitedUser.username,
        from: fromUser.username,
      };

      if (isNewUser) stats.event("new_invited_user", _.extend(metrics, { userId: fromUser.id })); // this should happen only once
      stats.event('user_added_someone', _.extend(metrics, { userId: fromUser.id }));
    })
    .thenResolve(invitedUser);
}

function addUserToRoom(room, instigatingUser, usernameToAdd) {
  return Q.all([
    roomPermissionsModel(instigatingUser, 'adduser', room),
    canUserBeInvitedToJoinRoom(usernameToAdd, room, instigatingUser)
  ]).spread(function (canInvite, canJoin) {
      if (!canInvite) throw new StatusError(403, 'You do not have permission to add people to this room.');
      if (!canJoin)   throw new StatusError(403, usernameToAdd + ' does not have permission to join this room.');
      return userService.findByUsername(usernameToAdd);
    })
    .then(function (existingUser) {
      if (existingUser && room.containsUserId(existingUser.id)) throw new StatusError(409, usernameToAdd + ' is already in this room.');

      var isNewUser = !existingUser;

      return [existingUser || userService.createInvitedUser(usernameToAdd), isNewUser];
    })
    .spread(function (invitedUser, isNewUser) {
      room.addUserById(invitedUser.id);
      return room.saveQ()
        .then(function () {
          return notifyInvitedUser(instigatingUser, invitedUser, room, isNewUser);
        });
    });
}

exports.addUserToRoom = addUserToRoom;

function revalidatePermissionsForUsers(room) {
  /* Re-insure that each user in the room has access to the room */
  var userIds = room.getUserIds();

  if(!userIds.length) return Q.resolve();

  return userService.findByIds(userIds)
    .then(function(users) {
      var usersHash = collections.indexById(users);

      return Q.all(userIds.map(function(userId) {
        var user = usersHash[userId];
        if(!user) {
          // Can't find the user?, remove them
          logger.warn('Unable to find user, removing from troupe', { userId: userId, troupeId: room.id });
          room.removeUserById(userId);
          return;
        }

        return roomPermissionsModel(user, 'join', room)
          .then(function(access) {
            if(!access) {
              logger.warn('User no longer has access to room', { userId: userId, troupeId: room.id });
              room.removeUserById(userId);
            }
          });
      }));
    })
    .then(function() {
      return room.saveQ();
    });
}
exports.revalidatePermissionsForUsers = revalidatePermissionsForUsers;

/**
 * The security of a room may be off. Do a check and update if required
 */
function ensureRepoRoomSecurity(uri, security) {
  if(security !== 'PRIVATE' && security != 'PUBLIC') {
    return Q.reject(new Error("Unknown security type: " + security));
  }

  return troupeService.findByUri(uri)
    .then(function(troupe) {
      if(!troupe) return;

      if(troupe.githubType != 'REPO') throw new Error("Only repo room security can be changed");

      /* No need to change it? */
      if(troupe.security === security) return;

      logger.info('Security of troupe does not match. Updating.', {
        roomId: troupe.id,
        uri: uri,
        current: troupe.security,
        security: security
      });

      troupe.security = security;
      troupe.dateLastSecurityCheck = new Date();

      return troupe.saveQ()
        .then(function() {
          if(security === 'PUBLIC') return;

          /* Only do this after the save, otherwise
           * multiple events will be generated */

          return revalidatePermissionsForUsers(troupe);
        });

    });
}
exports.ensureRepoRoomSecurity = ensureRepoRoomSecurity;


function findByIdForReadOnlyAccess(user, roomId) {
  return troupeService.findById(roomId)
    .then(function(troupe) {
      if(!troupe) throw 404; // Mandatory

      return roomPermissionsModel(user, 'view', troupe)
        .then(function(access) {
          if(access) return troupe;
          if(!user) return 401;
          throw 404;
        });
    });
}
exports.findByIdForReadOnlyAccess = findByIdForReadOnlyAccess;

function validateRoomForReadOnlyAccess(user, room) {
  if(!room) return Q.reject(404); // Mandatory

  return roomPermissionsModel(user, 'view', room)
    .then(function(access) {
      if(access) return;
      if(!user) return 401;
      throw 404;
    });
}
exports.validateRoomForReadOnlyAccess = validateRoomForReadOnlyAccess;

/**
 * Remove user from room
 * If the user to be removed is not the one requesting, check permissions
 */
function removeUserFromRoom(room, user, requestingUser) {
  if(!room) return Q.reject(new StatusError(400, 'Room required'));
  if(!user) return Q.reject(new StatusError(400, 'User required'));
  if(!requestingUser) return Q.reject(new StatusError(401, 'Not authenticated'));

  return Q.fcall(function() {
    // User is requesting user -> leave
    if(user.id === requestingUser.id) return true;
    // Check if not in one-to-one room and requesting user is admin
    if(room.githubType === 'ONETOONE') throw new StatusError(400, 'This room does not support removing.');
    return roomPermissionsModel(requestingUser, 'admin', room)
    .then(function(access) {
      if(!access) throw new StatusError(403, 'You do not have permission to remove people. Admin permission is needed.');
    });
  })
  // Do the removal
  .then(function() {
    room.removeUserById(user.id);
    return room.saveQ();
  });
}
exports.removeUserFromRoom = removeUserFromRoom;

function canBanInRoom(room) {
  if(room.githubType === 'ONETOONE') return false;
  if(room.githubType === 'ORG') return false;
  if(room.security === 'PRIVATE') return false; /* No bans in private rooms */

  return true;
}

function banUserFromRoom(room, username, requestingUser, callback) {
  if(!room) return Q.reject(new StatusError(400, 'Room required')).nodeify(callback);
  if(!username) return Q.reject(new StatusError(400, 'Username required')).nodeify(callback);
  if(!requestingUser) return Q.reject(new StatusError(401, 'Not authenticated')).nodeify(callback);
  if(requestingUser.username === username) return Q.reject(new StatusError(400, 'You cannot ban yourself')).nodeify(callback);
  if(!canBanInRoom(room)) return Q.reject(new StatusError(400, 'This room does not support banning.')).nodeify(callback);

  /* Does the requesting user have admin rights to this room? */
  return roomPermissionsModel(requestingUser, 'admin', room)
    .then(function(access) {
      if(!access) throw new StatusError(403, 'You do not have permission to ban people. Admin permission is needed.');

      return userService.findByUsername(username);
    })
    .then(function(user) {
      if(!user) throw new StatusError(404, 'User ' + username + ' not found.');

      return roomPermissionsModel(user, 'admin', room)
        .then(function(bannedUserIsAdmin) {
          if(bannedUserIsAdmin) throw new StatusError(400, 'User ' + username + ' is an admin in this room.');

          var existingBan = _.find(room.bans, function(ban) { return ban.userId == user.id;} );

          if(existingBan) {
            return existingBan;
          } else {
            var ban = new persistence.TroupeBannedUser({
              userId: user.id,
              bannedBy: requestingUser.id
            });

            room.bans.push(ban);

            room.removeUserById(user.id);

            return room.saveQ()
              .then(function() {
                return eventService.newEventToTroupe(
                  room, requestingUser,
                  "User @" + requestingUser.username + " banned @" + username + " from this room",
                  {
                    service: 'bans',
                    event: 'banned',
                    bannedUser: username,
                    prerendered: true,
                    performingUser: requestingUser.username
                  }, {}, function(err) {
                  if(err) logger.error("Unable to create an event in troupe: " + err, { exception: err });
                });
              })
              .thenResolve(ban);
          }

        });

    })
    .nodeify(callback);
}
exports.banUserFromRoom = banUserFromRoom;

function unbanUserFromRoom(room, troupeBan, username, requestingUser, callback) {
  if(!room) return Q.reject(new StatusError(400, 'Room required')).nodeify(callback);
  if(!troupeBan) return Q.reject(new StatusError(400, 'Username required')).nodeify(callback);
  if(!requestingUser) return Q.reject(new StatusError(401, 'Not authenticated')).nodeify(callback);

  if(!canBanInRoom(room)) return Q.reject(new StatusError(400, 'This room does not support bans')).nodeify(callback);

  /* Does the requesting user have admin rights to this room? */
  return roomPermissionsModel(requestingUser, 'admin', room)
    .then(function(access) {
      if(!access) throw new StatusError(403, 'You do not have permission to unban people. Admin permission is needed.');

      room.bans.pull({ _id: troupeBan._id });

      return room.saveQ();
    })
    .then(function() {
      return eventService.newEventToTroupe(
        room, requestingUser,
        "User @" + requestingUser.username + " unbanned @" + username + " from this room",
        {
          service: 'bans',
          event: 'unbanned',
          bannedUser: username,
          prerendered: true,
          performingUser: requestingUser.username
        }, {}, function(err) {
        if(err) logger.error("Unable to create an event in troupe: " + err, { exception: err });
      });
    })
    .nodeify(callback);
}
exports.unbanUserFromRoom = unbanUserFromRoom;
