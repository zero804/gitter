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
var validateRoomName = require('gitter-web-validators/lib/validate-room-name');
var persistence = require('gitter-web-persistence');
var uriLookupService = require("./uri-lookup-service");
var policyFactory = require('gitter-web-permissions/lib/legacy-policy-factory');
var securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor-service');
var canUserBeInvitedToJoinRoom = require('gitter-web-permissions/lib/invited-permissions-service');
var userService = require('./user-service');
var troupeService = require('./troupe-service');
var oneToOneRoomService = require('./one-to-one-room-service');
var userDefaultFlagsService = require('./user-default-flags-service');
var validateUri = require('gitter-web-github').GitHubUriValidator;
var GitHubRepoService = require('gitter-web-github').GitHubRepoService;
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
var redisLockPromise = require("../utils/redis-lock-promise");
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
var legacyMigration = require('gitter-web-permissions/lib/legacy-migration');

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
 * Returns Promise{boolean} if the user can join the room
 */
function joinRoomForGitHubUri(user, troupe) {
  /* The troupe exists. Ensure it's not past the max limit and the user can join */
  return policyFactory.createPolicyForRoom(user, troupe)
    .then(function(policy) {
      return policy.canJoin();
    })
    .then(function(joinAccess) {
      debug('Does user %s have access to existing room? %s', (user && user.username || '~anon~'), joinAccess);

      if (!joinAccess) return false;

      // If the user has access to the room, assert member count
      return assertJoinRoomChecks(troupe, user)
        .then(function() {
          return true;
        });
    });
}

function doPostGitHubRoomCreationTasks(troupe, user, githubType, security, options) {
  var uri = troupe.uri;
  if (!user) return; // Can this ever happen?

  if (options.skipPostCreationSteps) return;

  if (githubType !== 'REPO') return;

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

  if(security === 'PUBLIC' && badgerEnabled && options.addBadge) {
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

      switch (githubType) {
        case 'ORG':
        case 'REPO':
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
      // TODO: switch out for policy...
      // Parent rooms always have security == null
      return policyFactory.createPolicyForGithubObject(user, officialUri, githubType, null)
        .bind({
          troupe: null,
          updateExisting: null,
          groupId: null
        })
        .then(function(policy) {
          return policy.canAdmin();
        })
        .then(function(access) {
          debug('Does the user have access to create room %s? %s', uri, access);

          // If the user is not allowed to create this room, go no further
          if(!access) throw new StatusError(403);
          return ensureGroupForGitHubRoom(user, githubType, officialUri);
        })
        .then(function(group) {
          // TODO: this will change when uris break away
          var queryTerm;

          if (githubId) {
            queryTerm = { $or: [{ githubId: githubId }, { lcUri: lcUri }], githubType: githubType };
          } else {
            queryTerm = { lcUri: lcUri, githubType: githubType };
          }

          // TODO: remove this when lcOwner goes away
          var lcOwner = lcUri.split('/')[0];

          var groupId = this.groupId = group._id;

          var sd = securityDescriptorGenerator.generate(user, {
              linkPath: officialUri,
              type: 'GH_'+githubType, // GH_USER, GH_ORG or GH_REPO
              externalId: githubId,
              security: githubType === 'ORG' ? 'PRIVATE' : security
            });

          debug('Attempting to upsert room using query: %j', queryTerm);

          return mongooseUtils.upsert(persistence.Troupe, queryTerm, {
              $setOnInsert: {
                lcUri: lcUri,
                lcOwner: lcOwner, // This will go
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
          /* Next stage - post creation migration */
          var troupe = this.troupe = upsertResult[0];
          var updateExisting = this.updateExisting = upsertResult[1];
          var groupId = this.groupId;

          debug('Upsert found an existing room? %s', updateExisting);

          /* Next stage - possible rename */
          // New room? Skip this step
          if (!updateExisting) return;

          var updateRequired = false;
          var set = {};

          if (troupe.githubId !== githubId) {
            updateRequired = true;
            set.githubId = githubId;
          }

          if (!troupe.groupId) {
            updateRequired = true;
            set.groupId = groupId;
          }

          if (!updateRequired) return;

          debug('Updating existing room with values %j', set);

          return persistence.Troupe.findOneAndUpdate({ _id: troupe._id }, { $set: set })
            .exec()
            .bind(this)
            .then(function(troupe) {
              this.troupe = troupe;
            })
        })
        .tap(function() {
          var troupe = this.troupe;
          var updateExisting = this.updateExisting;

          if (!updateExisting) return;

          // Rename URLS if required

          // Existing room and name hasn't changed? Skip
          if (troupe.uri === officialUri) return;

          // Not a repo or we're no longer renaming, skip too
          if (githubType !== 'REPO' || splitsvilleEnabled) return;

          debug('Attempting to rename room %s to %s', uri, officialUri);

          // Check if the new room already exists
          return persistence.Troupe.findOne({ githubType: 'REPO', githubId: githubId, lcUri: officialUri.toLowerCase() })
            .exec()
            .bind(this)
            .then(function(newRoom) {
              if (newRoom) return newRoom;

              // New room does not exist, use it instead
              return renameRepo(troupe.uri, officialUri)
                .then(function() {
                  /* Refetch the troupe */
                  return troupeService.findById(troupe.id);
                });
            })
            .then(function(troupe) {
              this.troupe = troupe;
            });
        })
        .tap(function() {
          /* Next stage - post creation tasks */
          var troupe = this.troupe;
          var updateExisting = this.updateExisting;

          if (updateExisting) return;

          return doPostGitHubRoomCreationTasks(troupe, user, githubType, security, options);
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
    .spread(function (resolvedUser, resolvedTroupe, roomMember) {
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
              return policy.canView();
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
        if (roomMember) {
          debug("User is already a member of the room %s. Allowing access", resolvedTroupe.uri);

          return {
            troupe: resolvedTroupe
          };
        }

        debug("Room %s exists, but user is not a member", resolvedTroupe.uri);

        return joinRoomForGitHubUri(user, resolvedTroupe)
          .then(function(access) {
            return ensureAccessControl(user, resolvedTroupe, access)
              .then(function (userRoomMembershipChanged) {
                if (!access) throw new StatusError(404);

                // if the user has been granted access to the room, send join stats for the cases of being the owner or just joining the room
                if(userRoomMembershipChanged) {
                  /* Note that options.tracking is never sent as a param */
                  sendJoinStats(user, resolvedTroupe, options.tracking);
                }

                return {
                  troupe: resolvedTroupe,
                  didCreate: false
                };
              });
          })
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
  if (!validateRoomName(name)) {
    var err = new StatusError(400);
    err.clientDetail = {
      illegalName: true
    };
    throw err;
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
    throw new StatusError(400, "Bad channel uri");
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

  return Promise.try(function() {
      if (parentTroupe.groupId) return parentTroupe.groupId;

      // The parent troupe does not have a groupId, but it should
      // so, create the group add the parent to the group and
      // the user the same groupId in the creation of this room
      return groupService.migration.ensureGroupForRoom(parentTroupe, user)
        .then(function(group) {
          return group && group._id;
        });
    })
    .then(function(groupId) {
      return createChannel(user, null, {
        uri: uri,
        security: options.security,
        githubType: githubType,
        groupId: groupId
      });
    })
}

/**
 * Create a channel under a user
 */
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

  return groupService.migration.ensureGroupForUser(user)
    .then(function(group) {
      var groupId = group && group._id;
      var uri = user.username + '/' + name;

      return createChannel(user, null, {
        uri: uri,
        security: options.security,
        githubType: 'USER_CHANNEL',
        groupId: groupId
      });
    })
}

/**
 * @private
 */
function createChannel(user, parentRoom, options) {
  var uri = options.uri;
  var githubType = options.githubType;
  var lcUri = uri.toLowerCase();
  var lcOwner = lcUri.split('/')[0];
  var security = options.security;
  var groupId = options.groupId;

  // TODO: Add group support in here....
  return ensureNoRepoNameClash(user, uri)
    .then(function(clash) {
      if(clash) throw new StatusError(409, 'There is a repo at ' + uri + ' therefore you cannot create a channel there');
      return ensureNoExistingChannelNameClash(uri);
    })
    .then(function(clash) {
      if(clash) throw new StatusError(409, 'There is already a channel at ' + uri);

      var sd = legacyMigration.generateForNewChannel(user, parentRoom, {
        githubType: githubType,
        security: security,
        uri: uri
      });

      return mongooseUtils.upsert(persistence.Troupe,
        { lcUri: lcUri, githubType: githubType },
        {
          $setOnInsert: {
            lcUri: lcUri,
            lcOwner: lcOwner,
            groupId: groupId,
            uri: uri,
            security: security,
            parentId: parentRoom ? parentRoom._id : undefined,
            ownerUserId: parentRoom ? undefined: user._id,
            githubType: githubType,
            userCount: 0,
            sd: sd
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
          return roomMembershipService.addRoomMember(room._id, addedUser._id, flags, room.groupId);
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
//               return roomMembershipService.removeRoomMembers(room._id, removalUserIds, GROUPID);
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
        return removeRoomMemberById(roomId, userId);
      }

      // TODO: in future get rid of this but this collection is used by the native clients
      appEvents.dataChange2('/user/' + userId + '/rooms', 'patch', {
        id: roomId,
        favourite: null,
        lastAccessTime: null,
        mentions: 0,
        unreadItems: 0 }, 'room');
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

// This is the new way to add any type of room to a group and should replace
// all the types of room creation except one-to-ones
function upsertGroupRoom(user, group, roomInfo, securityDescriptor, options) {
  options = options || {}; // options.tracking
  var uri = roomInfo.uri;
  var topic = roomInfo.topic || null;
  var lcUri = uri.toLowerCase();

  // convert back to the old github-tied vars here
  var type = securityDescriptor.type || null;

  var githubType;
  var roomType;
  switch (type) {
    case 'GH_ORG':
      githubType = 'ORG';
      roomType = 'github-room';
      break

    case 'GH_REPO':
      githubType = 'REPO';
      roomType = 'github-room';
      break

    case null:
      githubType = 'NONE';
      roomType = 'group-room'; // or channel?
      break;

    default:
      throw new StatusError(400, 'type is not known: ' + type);
  }


  return mongooseUtils.upsert(persistence.Troupe, { lcUri: lcUri }, {
      $setOnInsert: {
        groupId: group._id,
        topic: topic,
        uri: uri,
        lcUri: lcUri,
        userCount: 0,
        sd: securityDescriptor,
      }
    })
    .spread(function(room, updatedExisting) {
      if (updatedExisting) {
        /* Somehow someone beat us to it */
        throw new StatusError(409);
      }
      return room;
    })
    .tap(function(room) {
      var flags = userDefaultFlagsService.getDefaultFlagsForUser(user);
      return roomMembershipService.addRoomMember(room._id, user._id, flags);
    })
    .tap(function(room) {
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
    });
}

module.exports = {
  applyAutoHooksForRepoRoom: applyAutoHooksForRepoRoom,
  findAllRoomsIdsForUserIncludingMentions: findAllRoomsIdsForUserIncludingMentions,
  createRoomForGitHubUri: Promise.method(createRoomForGitHubUri),
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
  removeRoomMemberById: removeRoomMemberById,
  hideRoomFromUser: hideRoomFromUser,

  findBanByUsername: findBanByUsername,
  searchRooms: searchRooms,
  renameRepo: renameRepo,
  deleteRoom: deleteRoom,
  upsertGroupRoom: upsertGroupRoom,
  testOnly: {
    updateUserDateAdded: updateUserDateAdded
}
};
