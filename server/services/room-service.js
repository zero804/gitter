/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence      = require('./persistence-service');
var validateUri      = require('./github/github-uri-validator');
var uriLookupService = require("./uri-lookup-service");
var assert           = require("assert");
var winston          = require("winston");
var ObjectID         = require('mongodb').ObjectID;
var Q                = require('q');
var permissionsModel = require('./permissions-model');
var userService      = require('./user-service');
var troupeService    = require('./troupe-service');
var chatService      = require('./chat-service');
var nconf            = require('../utils/config');
var request          = require('request');
var xregexp          = require('xregexp').XRegExp;
var serializeEvent   = require('./persistence-service-events').serializeEvent;

function localUriLookup(uri) {
  return uriLookupService.lookupUri(uri)
    .then(function(uriLookup) {
      if(!uriLookup) return null;

      if(uriLookup.userId) {
        return userService.findById(uriLookup.userId)
          .then(function(user) {
            if(!user) return uriLookupService.removeBadUri(uri)
                                .thenResolve(null);

            if(user.username != uri && user.username.toLowerCase() === uri.toLowerCase()) throw { redirect: '/' + user.username };

            return { user: user };
          });
      }

      if(uriLookup.troupeId) {
        return troupeService.findById(uriLookup.troupeId)
          .then(function(troupe) {
            if(!troupe) return uriLookupService.removeBadUri(uri)
                                .thenResolve(null);

            if(troupe.uri != uri && troupe.uri.toLowerCase() === uri.toLowerCase()) throw { redirect: '/' + troupe.uri };
            return { troupe: troupe };
          });
      }

      return null;
    });
}

function applyAutoHooksForRepoRoom(user, troupe) {
  assert(user, 'user is required');
  assert(troupe, 'troupe is required');
  assert(troupe.githubType === 'REPO', 'Auto hooks can only be used on repo rooms. This room is a ', troupe.githubType);

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
        permissionsModel(user, 'join', uri, troupe.githubType)
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
      return permissionsModel(user, 'create', uri, githubType)
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
                users:  user ? [{ _id: new ObjectID(), userId: user._id }] : []
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
      return troupe.saveQ().thenResolve(troupe);
    } else {
      /* No access */
      if(!troupe.containsUserId(user.id)) return Q.resolve(null);

      troupe.removeUserById(user.id);
      return troupe.saveQ().thenResolve(null);
    }
  }

  return Q.resolve(null);
}

/**
 * Add a user to a room.
 * - If the room does not exist, will create the room if the user has permission
 * - If the room does exist, will add the user to the room if the user has permission
 * - If the user does not have access, will return null
 *
 * @return The promise of a troupe or nothing.
 */
function findOrCreateRoom(user, uri) {
  assert(uri, 'uri required');
  var userId = user.id;

  /* First off, try use local data to figure out what this url is for */
  return localUriLookup(uri)
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

var channelMatcher = xregexp('^[\\p{L}\\d]+$');

function createChannelForRoom(parentTroupe, user, name, callback) {
  return Q.fcall(function() {
    assert(name, 'Name is expected');
    assert(channelMatcher.test(name), 'Name is must be one or more letters long');

    var uri = parentTroupe.uri + '/*' + name;
    var lcUri = uri.toLowerCase();
    var githubType;
    switch(parentTroupe.githubType) {
      case 'ORG':
        githubType = 'ORG_CHANNEL';
        break;
      case 'REPO':
        githubType = 'REPO_CHANNEL';
        break;
      default:
        assert(false, 'Parent room must be an ORG or a REPO');
    }

    return permissionsModel(user, 'create', uri, githubType)
      .then(function(access) {
        if(!access) throw 403;

        var nonce = Math.floor(Math.random() * 100000);

        return persistence.Troupe.findOneAndUpdateQ(
          { lcUri: lcUri, githubType: githubType },
          {
            $setOnInsert: {
              lcUri: lcUri,
              uri: uri,
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

              // Indeed the room was just created right now
              // Notify people or something at this point I
              // guess
              var text = "[CHANNEL] New channel *" + name + " created by " + user.username;
              var meta = {
                uri: newRoom.uri,
                name: newRoom.name,
                user: user.username,
                type: 'webhook',
                service: 'gitter',
                event: 'channel'
              };

              return chatService.newRichMessageToTroupe(parentTroupe, null, text, meta)
                .thenResolve(newRoom);
            }
            return newRoom;
          });
      });
   })
   .then(function(newRoom) {
    // Add this room to the list of channels
    // owed by the parent
    parentTroupe.channels.addToSet(newRoom.id);
    return parentTroupe.saveQ()
      .thenResolve(newRoom);
   })
   .nodeify(callback);
}
exports.createChannelForRoom = createChannelForRoom;