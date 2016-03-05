"use strict";

var env               = require('gitter-web-env');
var logger            = env.logger;
var stats             = env.stats;

var presenceService   = require('gitter-web-presence');
var restful           = require('../../services/restful');
var restSerializer    = require("../../serializers/rest-serializer");
var mongoUtils        = require('../../utils/mongo-utils');
var StatusError       = require('statuserror');
var bayeuxExtension   = require('./extension');
var Promise           = require('bluebird');
var userCanAccessRoom = require('../../services/user-can-access-room');
var debug             = require('debug')('gitter:bayeux-authorisor');
var recentRoomService = require('../../services/recent-room-service');

var survivalMode = !!process.env.SURVIVAL_MODE || false;

if (survivalMode) {
  logger.error("WARNING: Running in survival mode");
}

// TODO: use a lightweight routing library for this....
// Strategies for authenticating that a user can subscribe to the given URL
var routes = [{
    re: /^\/api\/v1\/(?:troupes|rooms)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription,
    populator: populateTroupe
  }, {
    re: /^\/api\/v1\/(?:troupes|rooms)\/(\w+)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription,
    populator: populateSubTroupeCollection
  }, {
    re: /^\/api\/v1\/(?:troupes|rooms)\/(\w+)\/(\w+)\/(\w+)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription,
    populator: populateSubSubTroupeCollection
  }, {
    re: /^\/api\/v1\/user\/(\w+)\/(\w+)$/,
    validator: validateUserForUserSubscription,
    populator: populateSubUserCollection
  }, {
    re: /^\/api\/v1\/user\/(\w+)\/(?:troupes|rooms)\/(\w+)\/unreadItems$/,
    validator: validateUserForUserSubscription,
    populator: populateUserUnreadItemsCollection
  }, {
    re: /^\/api\/v1\/user\/(\w+)$/,
    validator: validateUserForUserSubscription
  }, {
    re: /^\/api\/v1\/ping(\/\w+)?$/,
    validator: validateUserForPingSubscription
  }, {
    re: /^\/api\/private\/diagnostics$/,
    validator: validateUserForPingSubscription
  }
];

// This strategy ensures that a user can access a URL under a troupe URL
function validateUserForSubTroupeSubscription(options) {
  var userId = options.userId;
  var match = options.match;
  var ext = options.message && options.message.ext;

  var troupeId = match[1];

  if(!mongoUtils.isLikeObjectId(troupeId)) {
    return Promise.reject(new StatusError(400, 'Invalid ID: ' + troupeId));
  }

  var promise = userCanAccessRoom.permissionToRead(userId, troupeId);
  if (ext && ext.reassociate) {
    promise = promise.then(function(access) {
      if (!access) return access;

      return presenceService.socketReassociated(options.clientId, userId, troupeId, !!ext.reassociate.eyeballs)
        .then(function() {
          // Update the lastAccessTime for the room
          if(userId) {
            return recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId);
          }
        })
        .catch(function(err) {
          logger.error('Unable to reassociate connection or update last access: ', { exception: err, userId: userId, troupeId: troupeId });
        })
        .return(access);
    });
  }
  return promise;
}

// This is only used by the native client. The web client publishes to
// the url
function validateUserForPingSubscription(/* options */) {
  return Promise.resolve(true);
}

// This strategy ensures that a user can access a URL under a /user/ URL
function validateUserForUserSubscription(options) {
  var userId = options.userId;
  var match = options.match;
  var subscribeUserId = match[1];

  // All /user/ subscriptions need to be authenticated
  if(!userId) return Promise.resolve(false);

  if(!mongoUtils.isLikeObjectId(userId)) {
    return Promise.reject(new StatusError(400, 'Invalid ID: ' + userId));
  }

  var result = userId == subscribeUserId;

  return Promise.resolve(result);
}

function dataToSnapshot(type) {
  return function (data) {
    return { type: type, data: data };
  };
}

function populateSubUserCollection(options) {
  var userId = options.userId;
  var match = options.match;
  var subscribeUserId = match[1];
  var collection = match[2];

  if(!userId || userId != subscribeUserId) {
    return Promise.resolve();
  }

  switch(collection) {
    case "rooms":
    case "troupes":
      return restful.serializeTroupesForUser(userId)
        .then(dataToSnapshot('user.rooms'));

    case "orgs":
      return restful.serializeOrgsForUserId(userId)
        .then(dataToSnapshot('user.orgs'));

    default:
      logger.error('Unable to provide snapshot for ' + collection);
  }

  return Promise.resolve();
}

function populateTroupe(options) {
  var userId = options.userId;
  var match = options.match;
  var snapshotOptions = options.snapshot || false;
  var troupeId = match[1];

  /**
   * For a troupe, the default is no snapshot, but if snapshot=true,
   * then we return the current troupe to the user
   */

  if (!snapshotOptions) return Promise.resolve();

  var strategy = new restSerializer.TroupeIdStrategy({
    currentUserId: userId,
    includePermissions: true,
    includeOwner: true
  });
  return restSerializer.serializeObject(troupeId, strategy)
    .then(dataToSnapshot('room'));
}

function populateSubTroupeCollection(options) {
  var userId = options.userId;
  var match = options.match;
  var snapshotOptions = options.snapshot || {}; // Details of the snapshot
  var troupeId = match[1];
  var collection = match[2];

  switch(collection) {
    case "chatMessages":
      if (survivalMode) {
        return Promise.resolve(dataToSnapshot('room.events')([]));
      }

      return restful.serializeChatsForTroupe(troupeId, userId, snapshotOptions)
        .then(dataToSnapshot('room.chatMessages'));

    case "users":
      if (survivalMode) {
        return Promise.resolve(dataToSnapshot('room.events')([]));
      }

      return restful.serializeUsersForTroupe(troupeId, userId, snapshotOptions)
      .then(dataToSnapshot('room.users'));

    case "events":
      if (survivalMode) {
        return Promise.resolve(dataToSnapshot('room.events')([]));
      }

      return restful.serializeEventsForTroupe(troupeId, userId)
        .then(dataToSnapshot('room.events'));

    default:
      logger.error('Unable to provide snapshot for ' + collection);
  }

  return Promise.resolve();
}

function populateSubSubTroupeCollection(options) {
  var match = options.match;
  var troupeId = match[1];
  var collection = match[2];
  var subId = match[3];
  var subCollection = match[4];

  switch(collection + '-' + subCollection) {
    case "chatMessages-readBy":
      return restful.serializeReadBysForChat(troupeId, subId)
        .then(dataToSnapshot('room.chatMessages.readBy'));


    default:
      logger.error('Unable to provide snapshot for ' + collection);
  }

  return Promise.resolve();
}

function populateUserUnreadItemsCollection(options) {
  var userId = options.userId;
  var match = options.match;
  var subscriptionUserId = match[1];
  var troupeId = match[2];

  if(!userId || userId !== subscriptionUserId) {
    return Promise.resolve();
  }

  return restful.serializeUnreadItemsForTroupe(troupeId, userId)
    .then(dataToSnapshot('user.room.unreadItems'));
}

// Authorize a sbscription message
function authorizeSubscribe(message, callback) {
  var clientId = message.clientId;

  return presenceService.lookupUserIdForSocket(clientId)
    .spread(function(userId, exists) {
      if(!exists) {
        debug("Client %s does not exist. userId=%s", clientId, userId);
        throw new StatusError(401, 'Client ' + clientId + ' not authenticated');
      }

      var match = null;

      var hasMatch = routes.some(function(route) {
        var m = route.re.exec(message.subscription);
        if(m) {
          match = { route: route, match: m };
        }
        return m;
      });

      if(!hasMatch) {
        throw new StatusError(404, "Unknown subscription " + message.subscription);
      }

      var validator = match.route.validator;
      var m = match.match;

      return validator({ userId: userId, match: m, message: message, clientId: clientId })
        .then(function(allowed) {
          return [userId, allowed];
        });
    })
    .nodeify(callback);
}

//
// Authorisation Extension - decides whether the user
// is allowed to connect to the subscription channel
//
module.exports = bayeuxExtension({
  channel: '/meta/subscribe',
  name: 'authorisor',
  failureStat: 'bayeux.subscribe.deny',
  skipSuperClient: true,
  skipOnError: true,
  privateState: true,
  incoming: function(message, req, callback) {
    // Do we allow this user to connect to the requested channel?
    return authorizeSubscribe(message)
      .spread(function(userId, allowed) {

        if(!allowed) {
          throw new StatusError(403, "Authorisation denied.");
        }

        message._private.authorisor = {
          snapshot: message.ext && message.ext.snapshot,
          userId: userId
        };

        return message;
      })
      .nodeify(callback);
  },

  outgoing: function(message, req, callback) {
    var clientId = message.clientId;

    var state = message._private && message._private.authorisor;
    var snapshot = state && state.snapshot;
    var userId = state && state.userId;

    var match = null;

    var hasMatch = routes.some(function(route) {
      var m = route.re.exec(message.subscription);
      if(m) {
        match = { route: route, match: m };
      }
      return m;
    });

    if(!hasMatch) return callback(null, message);

    var populator = match.route.populator;
    var m = match.match;

    /* The populator is all about generating the snapshot for the client */
    if(!clientId || !populator || snapshot === false) return callback(null, message);

    var startTime = Date.now();

    populator({ userId: userId, match: m, snapshot: snapshot })
      .then(function(snapshot) {
        if (!snapshot) return message;

        stats.responseTime('bayeux.snapshot.time', Date.now() - startTime);
        stats.responseTime('bayeux.snapshot.time.' + snapshot.type, Date.now() - startTime);

        if (snapshot.data === undefined && snapshot.meta === undefined) return message;

        if(!message.ext) message.ext = {};
        message.ext.snapshot = snapshot.data;
        message.ext.snapshot_meta = snapshot.meta;

        return message;
      })
      .nodeify(callback);

  }
});
