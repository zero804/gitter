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
var persistence                = require('gitter-web-persistence');
var uriLookupService           = require("./uri-lookup-service");
var policyFactory              = require('gitter-web-permissions/lib/legacy-policy-factory');
var securityDescriptorService  = require('gitter-web-permissions/lib/security-descriptor-service');
var legacyMigration            = require('gitter-web-permissions/lib/legacy-migration');
var canUserBeInvitedToJoinRoom = require('gitter-web-permissions/lib/invited-permissions-service');
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
var emailNotificationService   = require('./email-notification-service');
var emailAddressService        = require('./email-address-service');
var mongoUtils                 = require('gitter-web-persistence-utils/lib/mongo-utils');
var mongooseUtils              = require('gitter-web-persistence-utils/lib/mongoose-utils');
var badger                     = require('./badger-service');
var userSettingsService        = require('./user-settings-service');
var roomSearchService          = require('./room-search-service');
var assertJoinRoomChecks       = require('./assert-join-room-checks');
var redisLockPromise           = require("../utils/redis-lock-promise");
var unreadItemService          = require('./unread-items');
var debug                      = require('debug')('gitter:room-service');
var roomMembershipService      = require('./room-membership-service');
var liveCollections            = require('./live-collections');
var recentRoomService          = require('./recent-room-service');
var badgerEnabled              = nconf.get('autoPullRequest:enabled');
var uriResolver                = require('./uri-resolver');
var getOrgNameFromTroupeName   = require('gitter-web-shared/get-org-name-from-troupe-name');
var userScopes                 = require('gitter-web-identity/lib/user-scopes');

var splitsvilleEnabled = nconf.get("project-splitsville:enabled");

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

/**
 * Assuming that oneToOne uris have been handled already,
 * Figure out what this troupe is for
 *
 * @returns Promise of [troupe, hasJoinPermission] if the user is able to join/create the troupe
 */
function findOrCreateGroupRoom(user, troupe, uri, options) {
  debug("findOrCreateGroupRoom: %s", uri);

  if(!options) options = {};

  if(troupe) {
    debug('Room for uri %s exists', uri)
    /* The troupe exists. Ensure it's not past the max limit and the user can join */
    return policyFactory.createPolicyForRoom(user, troupe)
      .then(function(policy) {
        return [policy, policy.canJoin()];
      })
      .spread(function(policy, joinAccess) {
        debug('Does user %s have access to existing room? %s', (user && user.username || '~anon~'), joinAccess);

        var payload = {
          troupe: troupe,
          policy: policy,
          access: joinAccess,
          didCreate: false
        };

        if (!joinAccess) return payload;

        // If the user has access to the room, assert member count
        return assertJoinRoomChecks(troupe, user)
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

      debug('URI validation %s returned type=%s uri=%s', uri, githubType, officialUri);

      if(!options.ignoreCase &&
        officialUri !== uri &&
        officialUri.toLowerCase() === uri.toLowerCase()) {

        debug('Redirecting client from %s to official uri %s', uri, officialUri);
        throw extendStatusError(301, { path:  '/' + officialUri  });
      }

      /* Room does not yet exist */
      // TODO: switch out for policy...
      // Parent rooms always have security == null
      return policyFactory.createPolicyForGithubObject(user, officialUri, githubType, null)
        .then(function(policy) {
          return policy.canAdmin();
        })
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

          // TODO: this will change when uris break away
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
                userCount: 0,
              }
            })
            .tap(function(upsertResult) {
              var troupe = upsertResult[0];
              var updateExisting = upsertResult[1];

              if (updateExisting) return;

              var descriptor = legacyMigration.generatePermissionsForRoom(troupe, null, null);
              return securityDescriptorService.insertForRoom(troupe._id, descriptor);
            })
            .spread(function(troupe, updateExisting) {
              return [troupe, updateExisting, policyFactory.createPolicyForRoom(user, troupe)];
            })
            .spread(function(troupe, updateExisting, policy) {
              if (updateExisting) {
                /* Do we need to rename the old uri? */
                if (troupe.uri !== officialUri) {

                  // TODO: deal with ORG renames too!
                  if (githubType === 'REPO' && !splitsvilleEnabled) {
                    debug('Attempting to rename room %s to %s', uri, officialUri);

                    return renameRepo(troupe.uri, officialUri)
                      .then(function() {
                        /* Refetch the troupe */
                        return troupeService.findById(troupe.id)
                          .then(function(troupe) {
                            return [troupe, policyFactory.createPolicyForRoom(user, troupe)];
                          })
                          .spread(function(refreshedTroupe, refreshedPolicy) {
                            return {
                              troupe: refreshedTroupe,
                              policy: refreshedPolicy,
                              access: true,
                              didCreate: false
                            };
                          });
                      });
                  }
                }

                return {
                  troupe: troupe,
                  policy: policy,
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
              var hasScope = userScopes.hasGitHubScope(user, "public_repo");
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
                policy: policy,
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
// TODO: remove this in the new world where we've broken away from GH uris
function createGithubRoom(user, uri) {
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

      return policyFactory.createPolicyForGithubObject(user, officialUri, githubType, null)
        .then(function(policy) {
          return policy.canAdmin();
        })
        .then(function(hasAccess) {
          if (!hasAccess) throw new StatusError(403, 'Permission to create ' + officialUri + ' denied');
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
            .tap(function(upsertResult) {
              var room = upsertResult[0];
              var descriptor = legacyMigration.generatePermissionsForRoom(room, null, null);

              return securityDescriptorService.insertForRoom(room._id, descriptor);
            })
            .spread(function(room, updateExisting) {
              debug('Upsert found existing room? %s', updateExisting);

              if (!updateExisting) {
                stats.event("create_room", {
                  userId: user.id,
                  roomType: "github-room"
                });
              }

              if (updateExisting && room.uri !== uri && githubType === 'REPO' && !splitsvilleEnabled) {
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

  /**
   * this function returns an object containing accessDenied, which is used by the middlewares to allow the display
   * of public rooms instead of the standard 404.
   *
   * @private
   */
  function denyAccess(resolvedTroupe, policy) {
    if (!resolvedTroupe) return null;

    var uri = resolvedTroupe.uri;

    return {
      policy: policy,
      accessDenied: {
        githubType: resolvedTroupe.githubType
      },
      uri: uri
    };
  }

  /* First off, try use local data to figure out what this url is for */
  return uriResolver(user && user.id, uri, options)
    .spread(function (resolvedUser, resolvedTroupe, roomMember) {
      /* Deal with the case of the anonymous user first */
      if(!user) {
        if(resolvedUser) {
          debug("uriResolver returned user for uri=%s", uri);

          // TODO: figure out what we do for nonloggedin users viewing
          // user profiles
          return null;
        }

        if(resolvedTroupe) {
          debug("uriResolver returned troupe for uri=%s", uri);

          return policyFactory.createPolicyForRoom(user, resolvedTroupe)
            .then(function(policy) {
              return [policy, policy.canView()];
            })
            .spread(function(policy, viewAccess) {
              if (!viewAccess) {
                return denyAccess(resolvedTroupe, policy); // please see comment about denyAccess
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
        if(mongoUtils.objectIDsEqual(resolvedUser.id, userId)) {
          debug("localUriLookup returned own user for uri=%s", uri);

          return {
            ownUrl: true,
            oneToOne: false,
            troupe: null,
            policy: null,
            didCreate: false,
            uri: resolvedUser.username
          };
        }

        debug("localUriLookup returned user for uri=%s. Finding or creating one-to-one", uri);

        return oneToOneRoomService.findOrCreateOneToOneRoom(user, resolvedUser._id)
          .spread(function(troupe, resolvedUser) {

            return policyFactory.createPolicyForRoom(user, troupe)
              .then(function(policy) {
                return {
                  oneToOne: true,
                  troupe: troupe,
                  policy: policy,
                  otherUser: resolvedUser,
                  uri: resolvedUser.username,
                  roomMember: true
                };
              });
          });
      }

      if (resolvedTroupe && roomMember) {
        debug("User is already a member of the room %s. Allowing access", resolvedTroupe.uri);

        return policyFactory.createPolicyForRoom(user, resolvedTroupe)
          .then(function(policy) {
            // TODO: check the user has view rights
            return {
              troupe: resolvedTroupe,
              policy: policy,
              uri: resolvedTroupe.uri,
              roomMember: roomMember
            };

          });
      }

      debug("localUriLookup returned room %s for uri=%s. Finding or creating room", resolvedTroupe && resolvedTroupe.uri, uri);


      // resolvedTroupe may or may not exist at this point...
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
                if (githubType !== 'ORG' && githubType !== 'ONETOONE') githubType = null;
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

/**
 * Find all non-private channels under a particular parent
 */
function findAllChannelsForUser(user) {
  return persistence.Troupe.find({
      ownerUserId: user._id
    })
    .exec();
}

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

var ensureNoRepoNameClash = Promise.method(function (user, uri) {
  var parts = uri.split('/');

  if(parts.length < 2) {
    /* The classic "this should never happen" gag */
    throw "Bad channel uri";
  }

  if(parts.length === 2) {
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
});

function ensureNoExistingChannelNameClash(uri) {
  return troupeService.findByUri(uri)
    .then(function(troupe) {
      return !!troupe;
    });
}

function createRoomChannel(parentTroupe, user, options) {
  validate.expect(user, 'user is expected');
  validate.expect(options, 'options is expected');

  var name = options.name;
  var security = options.security;
  var uri, githubType;

  assertValidName(name);
  uri = parentTroupe.uri + '/' + name;

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

  switch(security) {
    case 'PUBLIC':
    case 'PRIVATE':
    case 'INHERITED':
      break;
    default:
      validate.fail('Invalid security option: ' + security);
  }

  return createChannel(user, null, {
    uri: uri,
    security: options.security,
    githubType: githubType,
  });
}


function createUserChannel(user, options) {
  validate.expect(user, 'user is expected');
  validate.expect(options, 'options is expected');

  var name = options.name;
  var security = options.security;

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

  var uri = user.username + '/' + name;
  return createChannel(user, null, {
    uri: uri,
    security: options.security,
    githubType: 'USER_CHANNEL',
  });
}

function createChannel(user, parentRoom, options) {
  var uri = options.uri;
  var githubType = options.githubType;
  var lcUri = uri.toLowerCase();
  var lcOwner = lcUri.split('/')[0];
  var security = options.security;

  // TODO: Add group support in here....
  return ensureNoRepoNameClash(user, uri)
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
            lcOwner: lcOwner,
            uri: uri,
            security: security,
            parentId: parentRoom ? parentRoom._id : undefined,
            ownerUserId: parentRoom ? undefined: user._id,
            githubType: githubType,
            userCount: 0
          }
        })
        .spread(function(newRoom, updatedExisting) {
          if (updatedExisting) {
            /* Somehow someone beat us to it */
            throw new StatusError(409);
          }

          return newRoom;
        })
        .tap(function(newRoom) {
          var descriptor = legacyMigration.generatePermissionsForRoom(newRoom, null, user);

          return securityDescriptorService.insertForRoom(newRoom._id, descriptor);
        })
        .tap(function(newRoom) {
          if (!user) return;

          var flags = userDefaultFlagsService.getDefaultFlagsForUser(user);

          return roomMembershipService.addRoomMember(newRoom._id, user._id, flags);
        })
        .tap(function(newRoom) {
          // Send the created room notification
          emailNotificationService.createdRoomNotification(user, newRoom) // send an email to the room's owner
            .catch(function(err) {
              logger.error('Unable to send create room notification: ' + err, { exception: err });
            });

          sendJoinStats(user, newRoom, options.tracking); // now the channel has now been created, send join stats for owner joining

          // TODO handle adding the user in the event that they didn't create the room!
          liveCollections.rooms.emit('create', newRoom, [user._id]);

          stats.event("create_room", {
            userId: user.id,
            roomType: "channel"
          });

          return uriLookupService.reserveUriForTroupeId(newRoom._id, uri);
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
function notifyInvitedUser(fromUser, invitedUser, room/*, isNewUser*/) {

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

      return roomMembershipService.addRoomMember(room._id, user._id, flags);
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
function addUserToRoom(room, instigatingUser, usernameToAdd) {
  return canUserBeInvitedToJoinRoom(usernameToAdd, room, instigatingUser)
    .then(function(canJoin) {
      if (!canJoin) throw new StatusError(403, usernameToAdd + ' does not have permission to join this room.');

      return userService.findByUsername(usernameToAdd);
    })
    .then(function (existingUser) {
      return assertJoinRoomChecks(room, existingUser)
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


/* Re-insure that each user in the room has access to the room */

// DISABLED
// function revalidatePermissionsForUsers(room) {
//   return roomMembershipService.findMembersForRoom(room._id)
//     .then(function(userIds) {
//         if(!userIds.length) return;
//
//         return userService.findByIds(userIds)
//           .then(function(users) {
//             var usersHash = collections.indexById(users);
//
//             var removalUserIds = [];
//
//             /** TODO: warning: this may run 10000 promises in parallel */
//             return Promise.map(userIds, function(userId) {
//               var user = usersHash[userId];
//               if(!user) {
//                 // Can't find the user?, remove them
//                 logger.warn('Unable to find user, removing from troupe', { userId: userId, troupeId: room.id });
//                 removalUserIds.push(userId);
//                 return;
//               }
//
//               return roomPermissionsModel(user, 'join', room)
//                 .then(function(access) {
//                   if(!access) {
//                     logger.warn('User no longer has access to room', { userId: userId, troupeId: room.id });
//                     removalUserIds.push(userId);
//                   }
//                 });
//             })
//             .then(function() {
//               if (!removalUserIds.length) return;
//               return roomMembershipService.removeRoomMembers(room._id, removalUserIds);
//             });
//           });
//     });
//
// }

/**
 * The security of a room may be off. Do a check and update if required
 */
function ensureRepoRoomSecurity(uri, security) {
  if(security !== 'PRIVATE' && security !== 'PUBLIC') {
    return Promise.reject(new Error("Unknown security type: " + security));
  }

  return troupeService.findByUri(uri)
    .then(function(troupe) {
      if(!troupe) return;

      if(troupe.githubType !== 'REPO') throw new Error("Only repo room security can be changed");

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
        // .then(function() {
        //   if(security === 'PUBLIC') return;
        //
        //   /* Only do this after the save, otherwise
        //    * multiple events will be generated */
        //
        //   return revalidatePermissionsForUsers(troupe);
        // })
        .return(troupe);

    });
}

/**
 * Remove user from room
 * If the user to be removed is not the one requesting, check permissions
 */
function removeUserFromRoom(room, user) {
  if (!room) throw new StatusError(400, 'Room required');
  if (!user) throw new StatusError(400, 'User required');
  // if (!requestingUser) throw new StatusError(401, 'Not authenticated');
  if (room.oneToOne || room.githubType === 'ONETOONE') throw new StatusError(400, 'This room does not support removing.');

  return roomMembershipService.removeRoomMember(room._id, user._id)
    .then(function() {
      // Remove favorites, unread items and last access times
      return recentRoomService.removeRecentRoomForUser(user._id, room._id);
    });
}

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
            // TODO: deal with externalId
            return securityDescriptorService.updateLinksForRepo(oldUri, newUri, null);
          })
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

              if (originalLcUri !== newChannelLcUri) {
                channel.renamedLcUris.addToSet(originalLcUri);
              }

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

module.exports = {
  applyAutoHooksForRepoRoom: applyAutoHooksForRepoRoom,
  findAllRoomsIdsForUserIncludingMentions: findAllRoomsIdsForUserIncludingMentions,
  createGithubRoom: Promise.method(createGithubRoom),
  createRoomByUri: createRoomByUri,
  createRoomChannel: Promise.method(createRoomChannel),
  createUserChannel: Promise.method(createUserChannel),
  findAllChannelsForRoomId: findAllChannelsForRoomId,
  findChildChannelRoom: findChildChannelRoom,
  findAllChannelsForUser: findAllChannelsForUser,
  findUsersChannelRoom: findUsersChannelRoom,
  joinRoom: Promise.method(joinRoom),
  addUserToRoom: addUserToRoom,
  /* DISABLED revalidatePermissionsForUsers: revalidatePermissionsForUsers, */
  ensureRepoRoomSecurity: ensureRepoRoomSecurity,
  removeUserFromRoom: Promise.method(removeUserFromRoom),
  hideRoomFromUser: hideRoomFromUser,

  findBanByUsername: findBanByUsername,
  searchRooms: searchRooms,
  renameRepo: renameRepo,
  deleteRoom: deleteRoom,
  testOnly: {
    updateUserDateAdded: updateUserDateAdded
}
};
