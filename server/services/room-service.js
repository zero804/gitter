/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env                = require('gitter-web-env');
var logger             = env.logger;
var nconf              = env.config;
var stats              = env.stats;
var errorReporter      = env.errorReporter;

var Q                  = require('q');
var request            = require('request');
var _                  = require('underscore');
var xregexp            = require('xregexp').XRegExp;
var persistence        = require('./persistence-service');
var validateUri        = require('gitter-web-github').GitHubUriValidator;
var uriLookupService   = require("./uri-lookup-service");
var permissionsModel   = require('./permissions-model');
var roomPermissionsModel = require('./room-permissions-model');
var userService        = require('./user-service');
var troupeService      = require('./troupe-service');
var GitHubRepoService  = require('gitter-web-github').GitHubRepoService;
var GitHubOrgService   = require('gitter-web-github').GitHubOrgService;
var validate           = require('../utils/validate');
var collections        = require('../utils/collections');
var StatusError        = require('statuserror');
var eventService       = require('./event-service');
var emailNotificationService = require('./email-notification-service');
var canUserBeInvitedToJoinRoom = require('./invited-permissions-service');
var emailAddressService = require('./email-address-service');
var mongoUtils         = require('../utils/mongo-utils');
var mongooseUtils      = require('../utils/mongoose-utils');
var badger             = require('./badger-service');
var userSettingsService = require('./user-settings-service');
var roomSearchService  = require('./room-search-service');
var assertMemberLimit  = require('./assert-member-limit');
var redisLockPromise   = require("../utils/redis-lock-promise");
var unreadItemService  = require('./unread-item-service');
var debug              = require('debug')('gitter:room-service');
var roomMembershipService = require('./room-membership-service');
var liveCollections    = require('./live-collections');

var badgerEnabled      = nconf.get('autoPullRequest:enabled');

exports.testOnly = {};

function localUriLookup(uri, opts) {
  debug("localUriLookup %s", uri);

  return uriLookupService.lookupUri(uri)
    .then(function (uriLookup) {
      if (!uriLookup) return;

      if(uriLookup.userId) {
        /* One to one */
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
        // TODO: get rid of this findById, make it lean, etc
        return troupeService.findById(uriLookup.troupeId)
          .then(function (troupe) {
            if(!troupe) {
              logger.info('Removing stale uri: ' + uri + ' from URI lookups');

              return uriLookupService.removeBadUri(uri)
                                      .thenResolve(null);
            }

            if (troupe.uri != uri) {
              if(troupe.uri.toLowerCase() === uri.toLowerCase()) {
                /* Only the case is wrong.... */
                if(!opts.ignoreCase) {
                  logger.info('Incorrect case for room: ' + uri + ' redirecting to ' + troupe.uri);
                  throw { redirect: '/' + troupe.uri };
                }
                /* Otherwise, continue */
              } else {
                // The name is completely different (due to a rename), always redirect
                throw { redirect: '/' + troupe.uri };
              }
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


/* Creates a visitor that determines whether a room type creation is allowed */
function makeRoomTypeCreationFilterFunction(creationFilter) {
  return function(githubType) {
    if(!creationFilter) return true; // Default create all

    if(githubType in creationFilter) return creationFilter[githubType];

    if('all' in creationFilter) return creationFilter.all;

    return true; // Default to true
  };
}

/**
 * Assuming that oneToOne uris have been handled already,
 * Figure out what this troupe is for
 *
 * @returns Promise of [troupe, hasJoinPermission] if the user is able to join/create the troupe
 */
function findOrCreateNonOneToOneRoom(user, troupe, uri, options) {
  debug("findOrCreateNonOneToOneRoom: %s", uri);

  if(!options) options = {};

  var roomTypeCreationFilterFunction = makeRoomTypeCreationFilterFunction(options.creationFilter);

  if(troupe) {
    /* The troupe exists. Ensure it's not past the max limit and the user can join */

    return roomPermissionsModel(user, 'join', troupe)
      .then(function(access) {
        debug('Does user %s have access to existing room? %s', (user && user.username || '~anon~'), access);

        var payload = {
          troupe: troupe,
          access: access,
          didCreate: false
        };

        if (!access) return payload;

        // If the user has access to the room, assert member count
        return assertMemberLimit(troupe, user)
          .then(function() {
            return payload;
          });
      });
  }

  /* From here on we're going to be doing a create */
  return validateUri(user, uri)
    .then(function(githubInfo) {
      debug("GitHub information for %s is %j", uri, githubInfo);

      /* If we can't determine the type, skip it */
      if(!githubInfo) {
        return {
          troupe: null,
          access: false,
          didCreate: false
        };
      }

      var githubType = githubInfo.type;
      var officialUri = githubInfo.uri;
      var lcUri = officialUri.toLowerCase();
      var security = githubInfo.security || null;
      var githubId = githubInfo.githubId || null;
      var topic = githubInfo.description;

      /* Are we going to allow users to create this type of room? */
      if(!roomTypeCreationFilterFunction(githubType)) {
        /* Don't allow creation */
        return {
          troupe: null,
          access: false,
          didCreate: false
        };
      }

      debug('URI validation %s returned type=%s uri=%s', uri, githubType, officialUri);

      if(!options.ignoreCase &&
        officialUri !== uri &&
        officialUri.toLowerCase() === uri.toLowerCase()) {

        debug('Redirecting client from %s to official uri %s', uri, officialUri);

        throw { redirect: '/' + officialUri };
      }

      /* Room does not yet exist */
      return permissionsModel(user, 'create', officialUri, githubType, null) // Parent rooms always have security == null
        .then(function(access) {
          debug('Does the user have access to create room %s? %s', uri, access);

          if(!access) {
            /* Access denied */
            return {
              troupe: null,
              access: false,
              didCreate: false
            };
          }

          var queryTerm = githubId ?
                { githubId: githubId, githubType: githubType } :
                { lcUri: lcUri, githubType: githubType };

          return mongooseUtils.upsert(persistence.Troupe, queryTerm, {
              $setOnInsert: {
                lcUri: lcUri,
                lcOwner: lcUri.split('/')[0],
                uri: officialUri,
                githubType: githubType,
                githubId: githubId,
                topic: topic || "",
                security: security,
                dateLastSecurityCheck: new Date(),
                // users:  user ? [{
                //   _id: new ObjectID(),
                //   userId: user._id
                // }] : [],
                userCount: user ? 1 : 0
              }
            })
            .spread(function(troupe, updateExisting) {
              if (updateExisting) {
                /* Do we need to rename the old uri? */
                if (troupe.uri !== officialUri) {

                  // TODO: deal with ORG renames too!
                  if (githubType === 'REPO') {
                    debug('Attempting to rename room %s to %s', uri, officialUri);

                    return renameRepo(troupe.uri, officialUri)
                      .then(function() {
                        /* Refetch the troupe */
                        return troupeService.findById(troupe.id)
                          .then(function(refreshedTroupe) {
                            return {
                              troupe: refreshedTroupe,
                              access: true,
                              didCreate: false
                            };
                          });
                      });
                  }
                }

                return {
                  troupe: troupe,
                  access: true,
                  didCreate: false
                };
              }

              /* The room was created atomically */
              if (user) {
                liveCollections.rooms.emit('create', troupe, [user._id]);
              }

              /* Created here */
              /* TODO: Later we'll need to handle private repos too */
              var hasScope = user.hasGitHubScope("public_repo");
              var hookCreationFailedDueToMissingScope;

              if(hasScope) {
                debug('Upgrading requirements');

                if(githubType === 'REPO') {
                  /* Do this asynchronously */
                  applyAutoHooksForRepoRoom(user, troupe)
                    .catch(function(err) {
                      logger.error("Unable to apply hooks for new room", { exception: err });
                      errorReporter(err, { uri: uri, user: user.username });
                    });
                }

              } else {
                if(githubType === 'REPO') {
                  debug('Skipping hook creation. User does not have permissions');
                  hookCreationFailedDueToMissingScope = true;
                }
              }

              if(githubType === 'REPO' && security === 'PUBLIC') {
                if(badgerEnabled && options.addBadge) {
                  /* Do this asynchronously (don't chain the promise) */
                  userSettingsService.getUserSettings(user.id, 'badger_optout')
                    .then(function(badgerOptOut) {
                      // If the user has opted out never send the pull request
                      if(badgerOptOut) return;

                      // Badgers Go!
                      return badger.sendBadgePullRequest(uri, user);
                    })
                    .catch(function(err) {
                      errorReporter(err, { uri: uri, user: user.username });
                      logger.error('Unable to send pull request for new room', { exception: err });
                    });
                }
              }

              return {
                troupe: troupe,
                access: true,
                didCreate: true,
                hookCreationFailedDueToMissingScope: hookCreationFailedDueToMissingScope
              };

            });


      });
    });
}


/* Keep this in as one day it'll probably be useful */

// function determineDefaultNotifyForRoom(user, troupe) {
//   var repoService = new GitHubRepoService(user);
//   return repoService.getRepo(troupe.uri)
//     .then(function(repoInfo) {
//       if(!repoInfo || !repoInfo.permissions) return 0;
//
//       /* Admin or push? Notify */
//       return repoInfo.permissions.admin || repoInfo.permissions.push ? 1 : 0;
//     });
// }

/**
 * Grant or remove the users access to a room
 * Makes the troupe reflect the users access to a room
 *
 * Returns true if changes were made
 */
function ensureAccessControl(user, troupe, access) {
  if(troupe) {
    if(access) {
      return roomMembershipService.addRoomMember(troupe._id, user._id);
    } else {
      return roomMembershipService.removeRoomMember(troupe._id, user._id);
    }
  }

  return Q.resolve(null);
}


function findAllRoomsIdsForUserIncludingMentions(userId, callback) {
  return Q.all([
      unreadItemService.getRoomIdsMentioningUser(userId),
      roomMembershipService.findRoomIdsForUser(userId)
    ])
    .spread(function(mentions, memberships) {
      return _.uniq(mentions.concat(memberships));
    })
    .nodeify(callback);
}
exports.findAllRoomsIdsForUserIncludingMentions = findAllRoomsIdsForUserIncludingMentions;

function updateRoomWithGithubId(user, troupe) {
  var promise;

  if (troupe.githubType === 'ORG') {
    promise = new GitHubRepoService(user).getRepo(troupe.uri);
  } else if (troupe.githubType === 'REPO') {
    promise = new GitHubOrgService(user).getOrg(troupe.uri);
  }

  if (promise) return Q.resolve();

  return promise.then(function(underlying) {
      if (!underlying) throw new StatusError(404, 'Unable to find ' + troupe.uri + ' on GitHub.');
      var githubId = underlying.id;

      return persistence.Troupe.updateQ({
          _id: troupe._id
        }, {
          $set: { githubId: githubId }
        });
    });
}

/*
 * Room created before early May 2015 didn't have the githubId
 * and so we were unable to track renames to these rooms.
 * This lazily updates the githubId on those rooms. New rooms
 * will be created with a githubId
 */
function updateRoomWithGithubIdIfRequired(user, troupe) {
  if (!troupe.githubId && (troupe.githubType === 'REPO' || troupe.githubType === 'ORG')) {
    return updateRoomWithGithubId(user, troupe)
      .catch(function(err) {
        logger.error('Unable to update repo room with githubId: ' + err, { uri: troupe.uri, exception: err });
      });
  }

}

/**
 * Add a user to a room.
 * - If the room does not exist, will create the room if the user has permission
 * - If the room does exist, will add the user to the room if the user has permission
 * - If the user does not have access, will return null
 *
 * @return The promise of a troupe or nothing.
 */
function findOrCreateRoom(user, uri, options) {
  debug("findOrCreateRoom %s %s %j", user && user.username, uri, options);

  var userId = user && user.id;
  options = options || {};
  validate.expect(uri, 'uri required');

  /**
   * this function returns an object containing accessDenied, which is used by the middlewares to allow the display
   * of public rooms instead of the standard 404
   */
  function denyAccess(uriLookup) {
    if (!uriLookup) return null;
    if (!uriLookup.troupe) return null;

    var troupe = uriLookup.troupe;
    var uri = troupe && troupe.uri;

    return {
      accessDenied: {
        githubType: troupe && troupe.githubType
      },
      uri: uri
    };
  }

  /* First off, try use local data to figure out what this url is for */
  return localUriLookup(uri, options)
    .then(function (uriLookup) {
      /* Deal with the case of the nonloggedin user first */
      if(!user) {
        if(!uriLookup) return null;

        if(uriLookup.user) {
          debug("localUriLookup returned user for uri=%s", uri);

          // TODO: figure out what we do for nonloggedin users viewing
          // user profiles
        }

        if(uriLookup.troupe) {
          debug("localUriLookup returned troupe for uri=%s", uri);

          var troupe = uriLookup.troupe;

          return roomPermissionsModel(null, 'view', troupe)
            .then(function (access) {
              if (!access) return denyAccess(uriLookup); // please see comment about denyAccess
              return {
                troupe: troupe,
                uri: troupe.uri
              };
            });
        }

        return null;
      }

      // If the Uri Lookup returned a user, do a one-to-one
      if(uriLookup && uriLookup.user) {
        var otherUser = uriLookup.user;

        if(otherUser.id == userId) {
          debug("localUriLookup returned own user for uri=%s", uri);

          return {
            ownUrl: true,
            oneToOne: false,
            troupe: null,
            didCreate: false,
            uri: otherUser.username
          };
        }

        debug("localUriLookup returned user for uri=%s. Finding or creating one-to-one", uri);

        var roomTypeCreationFilterFunction = makeRoomTypeCreationFilterFunction(options.creationFilter);

        // Are we allowed to create one-to-one rooms?
        if(!roomTypeCreationFilterFunction('ONETOONE')) {
          return null;
        }

        return permissionsModel(user, 'view', otherUser.username, 'ONETOONE', null)
          .then(function(access) {
            if(!access) return null;
            return troupeService.findOrCreateOneToOneTroupeIfPossible(userId, otherUser.id)
              .spread(function(troupe, otherUser) {
                return {
                  oneToOne: true,
                  troupe: troupe,
                  otherUser: otherUser,
                  uri: otherUser.username
                };
              });
          });
      }

      debug("localUriLookup returned room %s for uri=%s. Finding or creating room", uriLookup && uriLookup.troupe && uriLookup.troupe.uri, uri);

      // need to check for the rooms
      return findOrCreateNonOneToOneRoom(user, uriLookup && uriLookup.troupe, uri, options)
        .then(function(findOrCreateResult) {
          var troupe = findOrCreateResult.troupe;
          var access = findOrCreateResult.access;
          var hookCreationFailedDueToMissingScope = findOrCreateResult.hookCreationFailedDueToMissingScope;
          var didCreate = findOrCreateResult.didCreate;

          if (access && didCreate) {
            emailNotificationService.createdRoomNotification(user, troupe);  // now the san email to the room', wne
          }

          return ensureAccessControl(user, troupe, access)
            .then(function (userRoomMembershipChanged) {
              if (!access) return denyAccess(uriLookup); // please see comment about denyAccess

              // if the user has been granted access to the room, send join stats for the cases of being the owner or just joining the room
              if(access && (didCreate || userRoomMembershipChanged)) {
                sendJoinStats(user, troupe, options.tracking);
              }

              /* Async */
              updateRoomWithGithubIdIfRequired(user, troupe);

              return {
                oneToOne: false,
                troupe: troupe,
                hookCreationFailedDueToMissingScope: hookCreationFailedDueToMissingScope,
                didCreate: didCreate,
                uri: troupe.uri
              };
            });
        });
    })
    .then(function(uriLookup) {
      if(uriLookup && uriLookup.didCreate) {
        stats.event("create_room", {
          userId: user.id,
          roomType: "github-room"
        });
      }

      return uriLookup;
    });
}

exports.findOrCreateRoom = findOrCreateRoom;

/**
 * Find all non-private channels under a particular parent
 */
function findAllChannelsForRoom(user, parentTroupe, callback) {
  // FIXME: NOCOMMIT
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

        return mongooseUtils.upsert(persistence.Troupe,
          { lcUri: lcUri, githubType: githubType },
          {
            $setOnInsert: {
              lcUri: lcUri,
              lcOwner: lcUri.split('/')[0],
              uri: uri,
              security: security,
              parentId: parentTroupe && parentTroupe._id,
              ownerUserId: parentTroupe ? null : user._id,
              githubType: githubType,
              // users:  user ? [{ _id: new ObjectID(), userId: user._id }] : [],
              userCount:  user ? 1 : 0
            }
          })
          .spread(function(newRoom, updatedExisting) {
            if (!user) return [newRoom, updatedExisting];

            return roomMembershipService.addRoomMember(newRoom._id, user._id)
              .thenResolve([newRoom, updatedExisting]);
          })
          .spread(function(newRoom, updatedExisting) {
            emailNotificationService.createdRoomNotification(user, newRoom); // send an email to the room's owner
            sendJoinStats(user, newRoom, options.tracking); // now the channel has now been created, send join stats for owner joining

            if (updatedExisting) {
              /* Somehow someone beat us to it */
              throw new StatusError(409);
            }

            // TODO handle adding the user in the event that they didn't create the room!
            if (user) {
              liveCollections.rooms.emit('create', newRoom, [user._id]);
            }

            stats.event("create_room", {
              userId: user.id,
              roomType: "channel"
            });
            return uriLookupService.reserveUriForTroupeId(newRoom._id, uri)
              .thenResolve(newRoom);

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
function notifyInvitedUser(fromUser, invitedUser, room/*, isNewUser*/) {
  // get the email address
  return emailAddressService(invitedUser)
    .then(function (emailAddress) {
      var notification;

      if(invitedUser.state === 'REMOVED') {
        stats.event('user_added_removed_user');
        return; // This has been removed
      }

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

      stats.event('user_added_someone', _.extend(metrics, { userId: fromUser.id }));
    })
    .thenResolve(invitedUser);
}

function updateUserDateAdded(userId, roomId, date) {
  var setOp = {};
  setOp['added.' + roomId] = date || new Date();

  return persistence.UserTroupeLastAccess.updateQ(
     { userId: userId },
     { $set: setOp },
     { upsert: true });

}
exports.testOnly.updateUserDateAdded = updateUserDateAdded;

/**
 * Somebody adds another user to a room
 */
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
      return assertMemberLimit(room, existingUser)
        .then(function() {
          var isNewUser = !existingUser;

          return [existingUser || userService.createInvitedUser(usernameToAdd, instigatingUser, room._id), isNewUser];
        });
    })
    .spread(function (addedUser, isNewUser) {
      return roomMembershipService.addRoomMember(room._id, addedUser._id)
        .then(function(wasAdded) {
          if (!wasAdded) return addedUser;

          return Q.all([
            notifyInvitedUser(instigatingUser, addedUser, room, isNewUser),
            updateUserDateAdded(addedUser.id, room.id)
          ])
          .thenResolve(addedUser);
        });
    });

}

exports.addUserToRoom = addUserToRoom;

/* Re-insure that each user in the room has access to the room */
function revalidatePermissionsForUsers(room) {
  return roomMembershipService.findMembersForRoom(room._id)
    .then(function(userIds) {
        if(!userIds.length) return Q.resolve();

        return [userIds, userService.findByIds(userIds)];
    })
    .spread(function(userIds, users) {
      var usersHash = collections.indexById(users);

      var removalUserIds = [];

      /** TODO: warning: this may run 10000 promises in parallel */
      return Q.all(userIds.map(function(userId) {
        var user = usersHash[userId];
        if(!user) {
          // Can't find the user?, remove them
          logger.warn('Unable to find user, removing from troupe', { userId: userId, troupeId: room.id });
          removalUserIds.push(userId);
          return;
        }

        return roomPermissionsModel(user, 'join', room)
          .then(function(access) {
            if(!access) {
              logger.warn('User no longer has access to room', { userId: userId, troupeId: room.id });
              removalUserIds.push(userId);
            }
          });
      }))
      .then(function() {
        if (!removalUserIds.length) return;
        return roomMembershipService.removeRoomMembers(room._id, removalUserIds);
      });
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
        })
        .thenResolve(troupe);

    });
}
exports.ensureRepoRoomSecurity = ensureRepoRoomSecurity;


function findByIdForReadOnlyAccess(user, roomId) {
  return troupeService.findById(roomId)
    .then(function(troupe) {
      if(!troupe) throw new StatusError(404); // Mandatory

      return roomPermissionsModel(user, 'view', troupe)
        .then(function(access) {
          if(access) return troupe;
          if(!user) throw new StatusError(401);
          throw new StatusError(404);
        });
    });
}
exports.findByIdForReadOnlyAccess = findByIdForReadOnlyAccess;

function validateRoomForReadOnlyAccess(user, room) {
  if(!room) return Q.reject(404); // Mandatory

  return roomPermissionsModel(user, 'view', room)
    .then(function(access) {
      if(access) return;
      if(!user) throw new StatusError(401);
      throw new StatusError(404);
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
    return roomMembershipService.removeRoomMember(room._id, user._id);
  });
}
exports.removeUserFromRoom = removeUserFromRoom;

function canBanInRoom(room) {
  if(room.githubType === 'ONETOONE') return false;
  if(room.githubType === 'ORG') return false;
  if(room.security === 'PRIVATE') return false; /* No bans in private rooms */

  return true;
}

function banUserFromRoom(room, username, requestingUser, options, callback) {
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

          // Load the full object
          return persistence.Troupe.findByIdQ(room.id);
        })
        .then(function(roomForUpdate) {
          var existingBan = _.find(roomForUpdate.bans, function(ban) { return ban.userId == user.id;} );

          if(existingBan) {
            return existingBan;
          } else {
            var ban = roomForUpdate.addUserBan({
              userId: user.id,
              bannedBy: requestingUser.id
            });

            return Q.all([
                roomForUpdate.saveQ(),
                roomMembershipService.removeRoomMember(roomForUpdate._id, user._id)
              ])
              .then(function() {
                if (options && options.removeMessages) {
                  return persistence.ChatMessage.findQ({ toTroupeId: roomForUpdate.id, fromUserId: user.id })
                    .then(function(messages) {
                      return Q.all(messages.map(function(message) {
                        return message.removeQ();
                      }));
                    });

                }
              })
              .then(function() {
                return eventService.newEventToTroupe(
                  room, requestingUser,
                  "@" + requestingUser.username + " banned @" + username,
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


  var troupeId = room.id;

  /* Does the requesting user have admin rights to this room? */
  return roomPermissionsModel(requestingUser, 'admin', room)
    .then(function(access) {
      if(!access) throw new StatusError(403, 'You do not have permission to unban people. Admin permission is needed.');

      return persistence.Troupe.updateQ({
          _id: mongoUtils.asObjectID(troupeId)
        }, {
          $pull: {
            bans: {
              userId: troupeBan.userId
            }
          }
        });
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

/**
 * If the ban is found, returns { ban: troupeBan, user: user}, else returns null
 */
function findBanByUsername(troupeId, bannedUsername) {
  return userService.findByUsername(bannedUsername)
    .then(function(user) {
      if (!user) return;

      return persistence.Troupe.findOneQ({
        _id: mongoUtils.asObjectID(troupeId),
        'bans.userId': user._id },
        { _id: 0, 'bans.$': 1 },
        { lean: true })
        .then(function(troupe) {
          if (!troupe || !troupe.bans || !troupe.bans.length) return;

          return { ban: troupe.bans[0], user: user };
        });

    });
}
exports.findBanByUsername = findBanByUsername;


function updateTroupeLurkForUserId(userId, troupeId, lurk) {
  lurk = !!lurk; // Force boolean
  return roomMembershipService.setMemberLurkStatus(troupeId, userId, lurk)
    .then(function(changed) {
      // Did a change did not occur?
      if(!changed) return;

      if(lurk) {
        // Delete all the chats in Redis for this person too
        return unreadItemService.markAllChatsRead(userId, troupeId, { member: true });
      }
    });
}
exports.updateTroupeLurkForUserId = updateTroupeLurkForUserId;

function searchRooms(userId, queryText, options) {

  return persistence.Troupe
    .findQ({
      'users.userId': userId,
      $or: [{
          'githubType': 'ORG'
        },{
          'security': 'PRIVATE'
      }]
    }, {
      _id: 1
    })
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
exports.searchRooms = searchRooms;

/**
 * Rename a REPO room to a new URI.
 */
function renameRepo(oldUri, newUri) {
  if (oldUri === newUri) return Q.resolve();

  return redisLockPromise("lock:rename:" + oldUri, function() {
    return troupeService.findByUri(oldUri)
      .then(function(room) {
        if (!room) return;
        if (room.githubType !== 'REPO') throw new StatusError(400, 'Only repo rooms can be renamed');
        if (room.uri === newUri) return; // Case change, and it's already happened

        var originalLcUri = room.lcUri;
        var lcUri = newUri.toLowerCase();
        var lcOwner = lcUri.split('/')[0];

        room.uri = newUri;
        room.lcUri = lcUri;
        room.lcOwner = lcOwner;

        /* Only add if it's not a case change */
        if (originalLcUri !== lcUri) {
          room.renamedLcUris.addToSet(originalLcUri);
        }

        return room.saveQ()
          .then(function() {
            return uriLookupService.removeBadUri(oldUri);
          })
          .then(function() {
            return uriLookupService.reserveUriForTroupeId(room.id, lcUri);
          })
          .then(function() {
            return persistence.Troupe.findQ({ parentId: room._id });
          })
          .then(function(channels) {
            return Q.all(channels.map(function(channel) {
              var originalLcUri = channel.lcUri;
              var newChannelUri = newUri + '/' + channel.uri.split('/')[2];
              var newChannelLcUri = newChannelUri.toLowerCase();

              channel.lcUri = newChannelLcUri;
              channel.uri = newChannelUri;
              channel.lcOwner = lcOwner;

              return channel.saveQ()
                .then(function() {
                  return uriLookupService.removeBadUri(originalLcUri);
                })
                .then(function() {
                  return uriLookupService.reserveUriForTroupeId(channel.id, newChannelLcUri);
                });
            }));

          });

      });

  });

}
exports.renameRepo = renameRepo;
