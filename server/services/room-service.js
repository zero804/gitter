/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston            = require("winston");
var ObjectID           = require('mongodb').ObjectID;
var Q                  = require('q');
var request            = require('request');
var _                  = require('underscore');
var xregexp            = require('xregexp').XRegExp;
var persistence        = require('./persistence-service');
var validateUri        = require('./github/github-uri-validator');
var uriLookupService   = require("./uri-lookup-service");
var permissionsModel   = require('./permissions-model');
var userService        = require('./user-service');
var troupeService      = require('./troupe-service');
var nconf              = require('../utils/config');
var GitHubRepoService  = require('./github/github-repo-service');
var unreadItemService  = require('./unread-item-service');
var appEvents          = require("../app-events");
var serializeEvent     = require('./persistence-service-events').serializeEvent;
var validate           = require('../utils/validate');

function localUriLookup(uri, opts) {
  return uriLookupService.lookupUri(uri)
    .then(function(uriLookup) {
      if(!uriLookup) return null;

      if(uriLookup.userId) {
        return userService.findById(uriLookup.userId)
          .then(function(user) {
            if(!user) return uriLookupService.removeBadUri(uri)
                                .thenResolve(null);

            if(!opts.ignoreCase && user.username != uri && user.username.toLowerCase() === uri.toLowerCase()) throw { redirect: '/' + user.username };

            return { user: user };
          });
      }

      if(uriLookup.troupeId) {
        return troupeService.findById(uriLookup.troupeId)
          .then(function(troupe) {
            if(!troupe) return uriLookupService.removeBadUri(uri)
                                .thenResolve(null);

            if(!opts.ignoreCase && troupe.uri != uri && troupe.uri.toLowerCase() === uri.toLowerCase()) throw { redirect: '/' + troupe.uri };

            return { troupe: troupe };
          });
      }

      return null;
    });
}

function applyAutoHooksForRepoRoom(user, troupe) {
  validate.expect(user, 'user is required');
  validate.expect(troupe, 'troupe is required');
  validate.expect(troupe.githubType === 'REPO', 'Auto hooks can only be used on repo rooms. This room is a '+ troupe.githubType);

  winston.info("Requesting autoconfigured integrations");

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
    winston.info("Autoconfiguration of webhooks completed. Success? " + !err);
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
  var urls = troupe.users.map(function(troupeUser) { return '/user/' + troupeUser.userId + '/troupes'; });
  serializeEvent(urls, 'create', troupe);
}

/**
 * Assuming that oneToOne uris have been handled already,
 * Figure out what this troupe is for
 *
 * @returns Promise of a troupe if the user is able to join/create the troupe
 */
function findOrCreateNonOneToOneRoom(user, troupe, uri) {
  if(troupe) {
    winston.verbose('Does user ' + user && user.username + ' have access to ' + uri + '?');

    return Q.all([
        troupe,
        permissionsModel(user, 'join', uri, troupe.githubType, troupe.security)
      ]);
  }

  var lcUri = uri.toLowerCase();

  winston.verbose('Attempting to validate URI ' + uri + ' on Github');

  /* From here on we're going to be doing a create */
  return validateUri(user, uri)
    .spread(function(githubType, officialUri, topic) {

      winston.verbose('URI validation ' + uri + ' returned ', { type: githubType, uri: officialUri });
      /* If we can't determine the type, skip it */
      if(!githubType) return [null, false];

      if(officialUri != uri && officialUri.toLowerCase() === uri.toLowerCase()) throw { redirect: '/' + officialUri };

      winston.verbose('Checking if user has permission to create a room at ' + uri);

      /* Room does not yet exist */
      return permissionsModel(user, 'create', uri, githubType, null) // Parent rooms always have security == null
        .then(function(access) {
          if(!access) return [null, access];

          var nonce = Math.floor(Math.random() * 100000);
          return persistence.Troupe.findOneAndUpdateQ(
            { lcUri: lcUri, githubType: githubType },
            {
              $setOnInsert: {
                lcUri: lcUri,
                uri: uri,
                _nonce: nonce,
                githubType: githubType,
                topic: topic || "",
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
                  winston.verbose('Upgrading requirements');

                  if(githubType === 'REPO') {
                    /* Do this asynchronously */
                    applyAutoHooksForRepoRoom(user, troupe)
                      .catch(function(err) {
                        winston.error("Unable to apply hooks for new room", { exception: err });
                      });
                  }

                } else {
                  if(githubType === 'REPO') {
                    winston.verbose('Skipping hook creation. User does not have permissions');
                    hookCreationFailedDueToMissingScope = true;
                  }
                }
              }

              return [troupe, true, hookCreationFailedDueToMissingScope, true];
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

      // IRC
      appEvents.userJoined({user: user, room: troupe});

      return troupe.saveQ().thenResolve(troupe);

    } else {
      /* No access */
      if(!troupe.containsUserId(user.id)) return Q.resolve(null);

      troupe.removeUserById(user.id);

      // IRC
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
function findOrCreateRoom(user, uri, opts) {
  validate.expect(uri, 'uri required');

  var userId = user.id;
  opts = opts || {};

  /* First off, try use local data to figure out what this url is for */
  return localUriLookup(uri, opts)
    .then(function(uriLookup) {
      winston.verbose('URI Lookup returned ', { uri: uri, isUser: !!(uriLookup && uriLookup.user), isTroupe: !!(uriLookup && uriLookup.troupe) });

      /* Lookup found a user? */
      if(uriLookup && uriLookup.user) {
        var otherUser = uriLookup.user;

        if(otherUser.id == userId) {
          winston.verbose('URI Lookup is our own');

          return { ownUrl: true };
        }

        winston.verbose('Finding or creating a one to one chat');

        return troupeService.findOrCreateOneToOneTroupeIfPossible(userId, otherUser.id)
          .spread(function(troupe, otherUser) {
            return { oneToOne: true, troupe: troupe, otherUser: otherUser };
          });
      }

      winston.verbose('Attempting to access room ' + uri);

      /* Didn't find a user, but we may have found another room */
      return findOrCreateNonOneToOneRoom(user, uriLookup && uriLookup.troupe, uri)
        .spread(function(troupe, access, hookCreationFailedDueToMissingScope, didCreate) {
          return ensureAccessControl(user, troupe, access)
            .then(function(troupe) {
              return { oneToOne: false, troupe: troupe, hookCreationFailedDueToMissingScope: hookCreationFailedDueToMissingScope, didCreate: didCreate };
            });
        });
    })
    .then(function(uriLookup) {
      if(uriLookup) uriLookup.uri = uri;
      return uriLookup;
    });
}

exports.findOrCreateRoom = findOrCreateRoom;

function findAllChannelsForRoom(troupe, callback) {
  return troupeService.findByIds(troupe.channels)
    .nodeify(callback);
}
exports.findAllChannelsForRoom = findAllChannelsForRoom;

function findChildChannelRoom(parentTroupe, childTroupeId, callback) {
  return Q.fcall(function() {
      if(parentTroupe.channels.some(function(troupeId) { return "" + childTroupeId == "" + troupeId; })) {
        return troupeService.findById(childTroupeId);
      } else {
        return null;
      }
    })
    .nodeify(callback);
}
exports.findChildChannelRoom = findChildChannelRoom;


function assertValidName(name) {
  var matcher = xregexp('^[\\p{L}\\d]+$');
  validate.expect(matcher.test(name));
}

var RANGE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgihjklmnopqrstuvwxyz01234567890';
function generateRandomName() {
  var s = '';
  for(var i = 0; i < 6; i++) {
    s += RANGE.charAt(Math.floor(Math.random() * RANGE.length));
  }
  return s;
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

      if(!{ OPEN: 1, PRIVATE: 1, INHERITED: 1 }.hasOwnProperty(security) ) {
        validate.fail('Invalid security option: ' + security);
      }

    } else {
      githubType = 'USER_CHANNEL';

      // Create a child room for a user
      switch(security) {
        case 'OPEN':
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
        if(!access) throw 403;

        var nonce = Math.floor(Math.random() * 100000);

        return persistence.Troupe.findOneAndUpdateQ(
          { lcUri: lcUri, githubType: githubType },
          {
            $setOnInsert: {
              lcUri: lcUri,
              uri: uri,
              security: security,
              name: name,
              _nonce: nonce,
              githubType: githubType,
              users:  user ? [{ _id: new ObjectID(), userId: user._id }] : []
            }
          },
          {
            upsert: true
          })
          .then(function(newRoom) {
            // TODO handle adding the user in the event that they didn't create the room!
            if(newRoom._nonce === nonce) {
              serializeCreateEvent(newRoom);
            }

            return newRoom;
          });
      })
     .then(function(newRoom) {
      if(parentTroupe && security !== 'PRIVATE') {
        // Add this room to the list of channels
        // owed by the parent
        parentTroupe.channels.addToSet(newRoom.id);
        return parentTroupe.saveQ()
          .thenResolve(newRoom);
      } else {
        return newRoom;
      }
    });

   })
  .nodeify(callback);
}
exports.createCustomChildRoom = createCustomChildRoom;