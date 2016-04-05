"use strict";

var env                = require('gitter-web-env');
var logger             = env.logger;
var nconf              = env.config;
var stats              = env.stats;
var errorReporter      = env.errorReporter;

var appEvents                  = require('gitter-web-appevents');
var Promise                    = require('bluebird');
var request                    = require('request');
var _                          = require('lodash');
var xregexp                    = require('xregexp').XRegExp;
var persistence                = require('./persistence-service');
var uriLookupService           = require("./uri-lookup-service");
var permissionsModel           = require('./permissions-model');
var roomPermissionsModel       = require('./room-permissions-model');
var userService                = require('./user-service');
var troupeService              = require('./troupe-service');
var oneToOneRoomService        = require('./one-to-one-room-service');
var userDefaultFlagsService    = require('./user-default-flags-service');
var validateUri                = require('gitter-web-github').GitHubUriValidator;
var GitHubRepoService          = require('gitter-web-github').GitHubRepoService;
var GitHubOrgService           = require('gitter-web-github').GitHubOrgService;
var validate                   = require('../utils/validate');
var collections                = require('../utils/collections');
var StatusError                = require('statuserror');
var eventService               = require('./event-service');
var emailNotificationService   = require('./email-notification-service');
var canUserBeInvitedToJoinRoom = require('./invited-permissions-service');
var emailAddressService        = require('./email-address-service');
var mongoUtils                 = require('../utils/mongo-utils');
var mongooseUtils              = require('../utils/mongoose-utils');
var badger                     = require('./badger-service');
var userSettingsService        = require('./user-settings-service');
var roomSearchService          = require('./room-search-service');
var assertMemberLimit          = require('./assert-member-limit');
var redisLockPromise           = require("../utils/redis-lock-promise");
var unreadItemService          = require('./unread-items');
var debug                      = require('debug')('gitter:room-service');
var roomMembershipService      = require('./room-membership-service');
var liveCollections            = require('./live-collections');
var recentRoomService          = require('./recent-room-service');
var badgerEnabled              = nconf.get('autoPullRequest:enabled');
var uriResolver                = require('./uri-resolver');
var getOrgNameFromTroupeName   = require('gitter-web-shared/get-org-name-from-troupe-name');

exports.testOnly = {};

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
    troupeId: room.id
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
  validate.expect(troupe.githubType === 'REPO', 'Auto hooks can only be used on repo rooms. This room is a '+ troupe.githubType);

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
function findOrCreateGroupRoom(user, troupe, uri, options) {
  debug("findOrCreateGroupRoom: %s", uri);

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
        throw extendStatusError(301, { path:  '/' + officialUri  });
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
                userCount: 0
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
                      errorReporter(err, { uri: uri, user: user.username }, { module: 'room-service' });
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
                      errorReporter(err, { uri: uri, user: user.username }, { module: 'room-service' });
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

/**
 * Grant or remove the users access to a room
 * Makes the troupe reflect the users access to a room
 *
 * Returns true if changes were made
 */
function ensureAccessControl(user, troupe, access) {
  if(troupe) {
    if(access) {
      var flags = userDefaultFlagsService.getDefaultFlagsForUser(user);
      return roomMembershipService.addRoomMember(troupe._id, user._id, flags);
    } else {
      return roomMembershipService.removeRoomMember(troupe._id, user._id);
    }
  }

  return Promise.resolve(null);
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

  if (promise) return Promise.resolve();

  return promise.then(function(underlying) {
      if (!underlying) throw new StatusError(404, 'Unable to find ' + troupe.uri + ' on GitHub.');
      var githubId = underlying.id;

      return persistence.Troupe.update(
          { _id: troupe._id },
          { $set: { githubId: githubId } })
        .exec();
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
 * Silently creates a room based on an org or repo (if the user has permission)
 * no emails are sent, noone is added
 * used to silently create owner rooms for org channels
 */
var createGithubRoom = Promise.method(function(user, uri) {
  if(!user) throw new StatusError(400, 'user required');
  if(!uri) throw new StatusError(400, 'uri required');

  return validateUri(user, uri)
    .then(function(githubInfo) {
      if (!githubInfo) throw new StatusError(400, uri + ' is not a github entity');

      var githubType = githubInfo.type;

      if (githubType !== 'ORG' && githubType !== 'REPO') {
        throw new StatusError(400, uri + ' is not an org or repo on github');
      }

      var officialUri = githubInfo.uri;
      var lcUri = officialUri.toLowerCase();
      var lcOwner = lcUri.split('/')[0];
      var security = githubInfo.security || null;
      var githubId = githubInfo.githubId || null;
      var topic = githubInfo.description || '';

      return permissionsModel(user, 'create', officialUri, githubType, null)
        .then(function(hasAccess) {
          if (!hasAccess) throw new StatusError(403, 'no permission to create ' + officialUri);
        })
        .then(function() {

          var queryTerm = { githubType: githubType };
          if (githubId) {
            // prefer queries with githubIds, as they survive github renames
            queryTerm.$or = [{ lcUri: lcUri }, { githubId: githubId }];
          } else {
            queryTerm.lcUri = lcUri;
          }

          debug('Upserting room for query %j', queryTerm);

          return mongooseUtils.upsert(persistence.Troupe, queryTerm, {
               $setOnInsert: {
                lcUri: lcUri,
                lcOwner: lcOwner,
                uri: officialUri,
                githubType: githubType,
                githubId: githubId,
                topic: topic,
                security: security,
                dateLastSecurityCheck: new Date(),
                userCount: 0
              }
            })
            .spread(function(room, updateExisting) {
              debug('Upsert found existing room? %s', updateExisting);

              if (!updateExisting) {
                stats.event("create_room", {
                  userId: user.id,
                  roomType: "github-room"
                });
              }

              if (updateExisting && room.uri !== uri && githubType === 'REPO') {
                // room has been renamed!
                // TODO: deal with ORG renames too!
                debug('Attempting to rename room %s to %s', room.uri, uri);

                return renameRepo(room.uri, uri)
                  .then(function() {
                    // return fresh renamed room
                    return troupeService.findById(room.id);
                  });
              }

              return room;
            });
        });
    });
});

exports.createGithubRoom = createGithubRoom;

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
  function denyAccess(resolvedTroupe) {
    if (!resolvedTroupe) return null;

    var uri = resolvedTroupe.uri;

    return {
      accessDenied: {
        githubType: resolvedTroupe.githubType
      },
      uri: uri
    };
  }

  /* First off, try use local data to figure out what this url is for */
  return uriResolver(user && user.id, uri, options)
    .spread(function (resolvedUser, resolvedTroupe, roomMember) {
      /* Deal with the case of the nonloggedin user first */
      if(!user) {
        if(resolvedUser) {
          debug("uriResolver returned user for uri=%s", uri);

          // TODO: figure out what we do for nonloggedin users viewing
          // user profiles
        }

        if(resolvedTroupe) {
          debug("uriResolver returned troupe for uri=%s", uri);

          return roomPermissionsModel(null, 'view', resolvedTroupe)
            .then(function (access) {
              if (!access) {
                return denyAccess(resolvedTroupe); // please see comment about denyAccess
              }

              return {
                troupe: resolvedTroupe,
                uri: resolvedTroupe.uri,
                roomMember: false
              };
            });
        }

        return null;
      }

      // If the Uri Lookup returned a user, do a one-to-one
      if(resolvedUser) {

        if(resolvedUser.id == userId) {
          debug("localUriLookup returned own user for uri=%s", uri);

          return {
            ownUrl: true,
            oneToOne: false,
            troupe: null,
            didCreate: false,
            uri: resolvedUser.username
          };
        }

        debug("localUriLookup returned user for uri=%s. Finding or creating one-to-one", uri);

        var roomTypeCreationFilterFunction = makeRoomTypeCreationFilterFunction(options.creationFilter);

        // Are we allowed to create one-to-one rooms?
        if(!roomTypeCreationFilterFunction('ONETOONE')) {
          return null;
        }

        return permissionsModel(user, 'view', resolvedUser.username, 'ONETOONE', null)
          .then(function(access) {
            if(!access) {
              // TODO: check whether this needs a slash at the front
              throw extendStatusError(404, { githubType: 'ONETOONE', uri: resolvedUser.username });
            }

            return oneToOneRoomService.findOrCreateOneToOneRoom(userId, resolvedUser.id)
              .spread(function(troupe, resolvedUser) {
                return {
                  oneToOne: true,
                  troupe: troupe,
                  otherUser: resolvedUser,
                  uri: resolvedUser.username,
                  roomMember: true
                };
              });
          });
      }


      if (resolvedTroupe && roomMember) {
        debug("User is already a member of the room %s. Allowing access", resolvedTroupe.uri);

        return {
          troupe: resolvedTroupe,
          uri: resolvedTroupe.uri,
          roomMember: roomMember
        };
      }

      debug("localUriLookup returned room %s for uri=%s. Finding or creating room", resolvedTroupe && resolvedTroupe.uri, uri);

      // need to check for the rooms
      return findOrCreateGroupRoom(user, resolvedTroupe, uri, options)
        .then(function(findOrCreateResult) {
          var troupe = findOrCreateResult.troupe;
          var access = findOrCreateResult.access;
          var hookCreationFailedDueToMissingScope = findOrCreateResult.hookCreationFailedDueToMissingScope;
          var didCreate = findOrCreateResult.didCreate;

          if (access && didCreate) {
            emailNotificationService.createdRoomNotification(user, troupe)  // now the san email to the room', wne
              .catch(function(err) {
                logger.error('Unable to send create room notification: ' + err, { exception: err });
              });
          }

          if(didCreate) {
            stats.event("create_room", {
              userId: user.id,
              roomType: "github-room"
            });
          }

          return ensureAccessControl(user, troupe, access)
            .then(function (userRoomMembershipChanged) {
              if (!access) {
                var githubType = troupe && troupe.githubType;
                // Only leak the githubType for ORGS and USERS
                // otherwise it's a security breach
                if (githubType != 'ORG' && githubType !== 'ONETOONE') githubType = null;
                var uri = githubType ? troupe && troupe.uri : null;

                throw extendStatusError(404, { githubType: githubType, uri: uri });
              }

              // if the user has been granted access to the room, send join stats for the cases of being the owner or just joining the room
              if(access && (didCreate || userRoomMembershipChanged)) {
                sendJoinStats(user, troupe, options.tracking);
              }

              /* Async */
              updateRoomWithGithubIdIfRequired(user, troupe);

              return {
                // oneToOne: false,
                troupe: troupe,
                hookCreationFailedDueToMissingScope: hookCreationFailedDueToMissingScope,
                didCreate: didCreate,
                uri: troupe.uri
              };
            });
        });
    });
}

exports.findOrCreateRoom = findOrCreateRoom;

/**
 * Find all non-private channels under a particular parent
 */
function findAllChannelsForRoomId(user, parentTroupeId) {
  return persistence.Troupe.find({ parentId: parentTroupeId, })
    .exec()
    .then(function(troupes) {
      if (!troupes.length) return troupes;

      var privateRooms = troupes
        .filter(function(troupe) {
          return troupe.security === 'PRIVATE';
        })
        .map(function(troupe) {
          return troupe._id;
        });

      if (!privateRooms.length) return troupes;

      // If there are private rooms, we need to filter out
      // any rooms which the user is not a member of...
      return roomMembershipService.findUserMembershipInRooms(user._id, privateRooms)
        .then(function(privateRoomsWithAccess) {
          var privateRoomsWithAccessHash = collections.hashArray(privateRoomsWithAccess);

          // Filter out all the rooms which are private to which this
          // use does not have access
          return troupes.filter(function(troupe) {
            if (troupe.security !== 'PRIVATE') return true; // Allow all non private rooms
            return privateRoomsWithAccessHash[troupe._id];
          });
        });
    });
}
exports.findAllChannelsForRoomId = findAllChannelsForRoomId;

/**
 * Given parent and child ids, find a child channel that is
 * not PRIVATE
 */
function findChildChannelRoom(user, parentTroupeId, childTroupeId) {
  return persistence.Troupe.findOne({
      parentId: parentTroupeId,
      id: childTroupeId
    })
    .exec()
    .then(function(channelRoom) {
      if (!channelRoom) return null;

      if (channelRoom.security !== 'PRIVATE') return channelRoom;

      // Before returning the private room to the user
      // make sure they have access to the room
      return roomMembershipService.checkRoomMembership(channelRoom._id, user._id)
        .then(function(isInRoom) {
          if (!isInRoom) return null;
          return channelRoom;
        });
    });
}
exports.findChildChannelRoom = findChildChannelRoom;

/**
 * Find all non-private channels under a particular parent
 */
function findAllChannelsForUser(user) {
  return persistence.Troupe.find({
      ownerUserId: user._id
    })
    .exec();
}
exports.findAllChannelsForUser = findAllChannelsForUser;

/**
 * Given parent and child ids, find a child channel that is
 * not PRIVATE
 */
function findUsersChannelRoom(user, childTroupeId, callback) {
  return persistence.Troupe.findOne({
      ownerUserId: user._id,
      id: childTroupeId
      /* Dont filter private as owner can see all private rooms */
    })
    .exec()
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
  return Promise.try(function() {
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
              userCount: 0
            }
          })
          .spread(function(newRoom, updatedExisting) {
            if (!user) return [newRoom, updatedExisting];

            var flags = userDefaultFlagsService.getDefaultFlagsForUser(user);

            return roomMembershipService.addRoomMember(newRoom._id, user._id, flags)
              .thenReturn([newRoom, updatedExisting]);
          })
          .spread(function(newRoom, updatedExisting) {

            // Send the created room notification
            emailNotificationService.createdRoomNotification(user, newRoom) // send an email to the room's owner
              .catch(function(err) {
                logger.error('Unable to send create room notification: ' + err, { exception: err });
              });

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
              .thenReturn(newRoom);

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
  return emailAddressService(invitedUser, { attemptDiscovery: true })
    .then(function (emailAddress) {
      var notification;

      if(invitedUser.state === 'REMOVED') {
        stats.event('user_added_removed_user');
        return; // This has been removed
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
exports.testOnly.updateUserDateAdded = updateUserDateAdded;

/* When a user wants to join a room */
function joinRoom(roomId, user, options) {
  options = options || {};
  return troupeService.findById(roomId)
    .then(function(room) {
      return roomPermissionsModel(user, 'join', room)
        .then(function(access) {
          if (!access) throw new StatusError(403);

          return assertMemberLimit(room, user);
        })
        .then(function() {
          // We need to add the last access time before adding the member to the room
          // so that the serialized create that the user receives will contain
          // the last access time and not be hidden in the troupe list
          return recentRoomService.saveLastVisitedTroupeforUserId(user._id, room._id, { skipFayeUpdate: true });
        })
        .then(function() {
          var flags = userDefaultFlagsService.getDefaultFlagsForUser(user);

          return roomMembershipService.addRoomMember(room._id, user._id, flags);
        })
        .then(function() {
          sendJoinStats(user, room, options.tracking);
        });
    });
}
exports.joinRoom = joinRoom;

/**
 * Somebody adds another user to a room
 */
function addUserToRoom(room, instigatingUser, usernameToAdd) {
  return Promise.all([
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
      // We need to add the last access time before adding the member to the room
      // so that the serialized create that the user receives will contain
      // the last access time and not be hidden in the troupe list
      return recentRoomService.saveLastVisitedTroupeforUserId(addedUser._id, room._id, { skipFayeUpdate: true })
        .then(function() {
          var flags = userDefaultFlagsService.getDefaultFlagsForUser(addedUser);
          return roomMembershipService.addRoomMember(room._id, addedUser._id, flags);
        })
        .then(function(wasAdded) {
          if (!wasAdded) return addedUser;

          return Promise.all([
            notifyInvitedUser(instigatingUser, addedUser, room, isNewUser),
            updateUserDateAdded(addedUser.id, room.id)
          ])
          .thenReturn(addedUser);
        });
    });

}

exports.addUserToRoom = addUserToRoom;

/* Re-insure that each user in the room has access to the room */
function revalidatePermissionsForUsers(room) {
  return roomMembershipService.findMembersForRoom(room._id)
    .then(function(userIds) {
        if(!userIds.length) return;

        return userService.findByIds(userIds)
          .then(function(users) {
            var usersHash = collections.indexById(users);

            var removalUserIds = [];

            /** TODO: warning: this may run 10000 promises in parallel */
            return Promise.map(userIds, function(userId) {
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
            })
            .then(function() {
              if (!removalUserIds.length) return;
              return roomMembershipService.removeRoomMembers(room._id, removalUserIds);
            });
          });
    });

}
exports.revalidatePermissionsForUsers = revalidatePermissionsForUsers;

/**
 * The security of a room may be off. Do a check and update if required
 */
function ensureRepoRoomSecurity(uri, security) {
  if(security !== 'PRIVATE' && security != 'PUBLIC') {
    return Promise.reject(new Error("Unknown security type: " + security));
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

      return troupe.save()
        .then(function() {
          if(security === 'PUBLIC') return;

          /* Only do this after the save, otherwise
           * multiple events will be generated */

          return revalidatePermissionsForUsers(troupe);
        }).thenReturn(troupe);

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
  if(!room) return Promise.reject(new StatusError(404)); // Mandatory

  return roomPermissionsModel(user, 'view', room)
    .then(function(access) {
      if(access) return;
      if(!user) throw new StatusError(401);
      throw new StatusError(404);
    });
}
exports.validateRoomForReadOnlyAccess = validateRoomForReadOnlyAccess;

function checkInstigatingUserPermissionForRemoveUser(room, user, requestingUser) {
  // User is requesting user -> leave
  if(user.id === requestingUser.id) return Promise.resolve(true);

  // Check if not in one-to-one room and requesting user is admin
  return roomPermissionsModel(requestingUser, 'admin', room);
}

/**
 * Remove user from room
 * If the user to be removed is not the one requesting, check permissions
 */
var removeUserFromRoom = Promise.method(function (room, user, requestingUser) {
  if (!room) throw new StatusError(400, 'Room required');
  if (!user) throw new StatusError(400, 'User required');
  if (!requestingUser) throw new StatusError(401, 'Not authenticated');
  if (room.githubType === 'ONETOONE') throw new StatusError(400, 'This room does not support removing.');

  return checkInstigatingUserPermissionForRemoveUser(room, user, requestingUser)
    .then(function(access) {
      if(!access) throw new StatusError(403, 'You do not have permission to remove people. Admin permission is needed.');

      return roomMembershipService.removeRoomMember(room._id, user._id);
    })
    .then(function() {
      // Remove favorites, unread items and last access times
      return recentRoomService.removeRecentRoomForUser(user._id, room._id);
    });
});
exports.removeUserFromRoom = removeUserFromRoom;

/**
 * Hides a room for a user.
 */
function hideRoomFromUser(roomId, userId) {
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

      if (userLurkStatus) {
        return roomMembershipService.removeRoomMember(roomId, userId);
      }

      // TODO: in future get rid of this but this collection is used by the native clients
      appEvents.dataChange2('/user/' + userId + '/rooms', 'patch', { id: roomId, favourite: null, lastAccessTime: null, mentions: 0, unreadItems: 0 }, 'room');
    });
}
exports.hideRoomFromUser = hideRoomFromUser;

function canBanInRoom(room) {
  if(room.githubType === 'ONETOONE') return false;
  if(room.githubType === 'ORG') return false;
  if(room.security === 'PRIVATE') return false; /* No bans in private rooms */

  return true;
}

function banUserFromRoom(room, username, requestingUser, options, callback) {
  return Promise.try(function() {
      if(!room) throw new StatusError(400, 'Room required');
      if(!username) throw new StatusError(400, 'Username required');
      if(!requestingUser) throw new StatusError(401, 'Not authenticated');
      if(requestingUser.username === username) throw new StatusError(400, 'You cannot ban yourself');
      if(!canBanInRoom(room)) throw new StatusError(400, 'This room does not support banning.');

      /* Does the requesting user have admin rights to this room? */
      return roomPermissionsModel(requestingUser, 'admin', room);
    })
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
          return persistence.Troupe.findById(room.id).exec();
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

            return Promise.all([
                roomForUpdate.save(),
                roomMembershipService.removeRoomMember(roomForUpdate._id, user._id)
              ])
              .then(function() {
                if (options && options.removeMessages) {
                  // TODO: do this in a single query...
                  return persistence.ChatMessage.find({ toTroupeId: roomForUpdate.id, fromUserId: user.id })
                    .exec()
                    .then(function(messages) {
                      return Promise.all(messages.map(function(message) {
                        return message.remove();
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
              }).thenReturn(ban);
          }

        });

    })
    .nodeify(callback);
}
exports.banUserFromRoom = banUserFromRoom;

function unbanUserFromRoom(room, troupeBan, username, requestingUser, callback) {
  return Promise.try(function() {
      if(!room) throw new StatusError(400, 'Room required');
      if(!troupeBan) throw new StatusError(400, 'Username required');
      if(!requestingUser) throw new StatusError(401, 'Not authenticated');

      if(!canBanInRoom(room)) throw new StatusError(400, 'This room does not support bans');

      /* Does the requesting user have admin rights to this room? */
      return [room.id, roomPermissionsModel(requestingUser, 'admin', room)];
    })
    .spread(function(troupeId, access) {
      if(!access) throw new StatusError(403, 'You do not have permission to unban people. Admin permission is needed.');

      return persistence.Troupe.update({
          _id: mongoUtils.asObjectID(troupeId)
        }, {
          $pull: {
            bans: {
              userId: troupeBan.userId
            }
          }
        })
        .exec();
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

      return persistence.Troupe.findOne({
        _id: mongoUtils.asObjectID(troupeId),
        'bans.userId': user._id },
        { _id: 0, 'bans.$': 1 },
        { lean: true })
        .exec()
        .then(function(troupe) {
          if (!troupe || !troupe.bans || !troupe.bans.length) return;

          return { ban: troupe.bans[0], user: user };
        });

    });
}
exports.findBanByUsername = findBanByUsername;

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
exports.searchRooms = searchRooms;

/**
 * Rename a REPO room to a new URI.
 */
function renameRepo(oldUri, newUri) {
  if (oldUri === newUri) return Promise.resolve();

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

        return room.save()
          .then(function() {
            return uriLookupService.removeBadUri(oldUri);
          })
          .then(function() {
            return uriLookupService.reserveUriForTroupeId(room.id, lcUri);
          })
          .then(function() {
            return persistence.Troupe.find({ parentId: room._id }).exec();
          })
          .then(function(channels) {
            return Promise.all(channels.map(function(channel) {
              var originalLcUri = channel.lcUri;
              var newChannelUri = newUri + '/' + channel.uri.split('/')[2];
              var newChannelLcUri = newChannelUri.toLowerCase();

              channel.lcUri = newChannelLcUri;
              channel.uri = newChannelUri;
              channel.lcOwner = lcOwner;

              return channel.save()
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
          return roomMembershipService.removeRoomMembers(troupe._id, userIds);
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
exports.deleteRoom = deleteRoom;
