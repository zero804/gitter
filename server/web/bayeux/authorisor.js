"use strict";

var env               = require('../../utils/env');
var logger            = env.logger;
var stats             = env.stats;

var presenceService   = require('../../services/presence-service');
var restful           = require('../../services/restful');
var mongoUtils        = require('../../utils/mongo-utils');
var StatusError       = require('statuserror');
var bayeuxExtension   = require('./extension');
var Q                 = require('q');
var userCanAccessRoom = require('../../services/user-can-access-room');

// Strategies for authenticating that a user can subscribe to the given URL
var routes = [{
    re: /^\/api\/v1\/(?:troupes|rooms)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription
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
  }
];

// This strategy ensures that a user can access a URL under a troupe URL
function validateUserForSubTroupeSubscription(options) {
  var userId = options.userId;
  var match = options.match;

  var troupeId = match[1];

  if(!mongoUtils.isLikeObjectId(troupeId)) {
    return Q.reject(new StatusError(400, 'Invalid ID: ' + troupeId));
  }

  return userCanAccessRoom(userId, troupeId);
}

// This is only used by the native client. The web client publishes to
// the url
function validateUserForPingSubscription(/* options */) {
  return Q.resolve(true);
}

// This strategy ensures that a user can access a URL under a /user/ URL
function validateUserForUserSubscription(options) {
  var userId = options.userId;
  var match = options.match;
  var subscribeUserId = match[1];

  // All /user/ subscriptions need to be authenticated
  if(!userId) return Q.resolve(false);

  if(!mongoUtils.isLikeObjectId(userId)) {
    return Q.reject(new StatusError(400, 'Invalid ID: ' + userId));
  }

  var result = userId == subscribeUserId;

  return Q.resolve(result);
}

function arrayToSnapshot(type) {
  return function(data) {
    return { type: type, data: data };
  };
}

function populateSubUserCollection(options) {
  var userId = options.userId;
  var match = options.match;
  var subscribeUserId = match[1];
  var collection = match[2];

  if(!userId || userId != subscribeUserId) {
    return Q.resolve();
  }

  switch(collection) {
    case "rooms":
    case "troupes":
      return restful.serializeTroupesForUser(userId)
        .then(arrayToSnapshot('user.rooms'));

    default:
      logger.error('Unable to provide snapshot for ' + collection);
  }

  return Q.resolve();
}

function populateSubTroupeCollection(options) {
  var userId = options.userId;
  var match = options.match;
  var snapshot = options.snapshot; // Details of the snapshot
  var troupeId = match[1];
  var collection = match[2];

  switch(collection) {
    case "chatMessages":
      var chatOptions = snapshot || {};

      return restful.serializeChatsForTroupe(troupeId, userId, chatOptions)
        .then(arrayToSnapshot('room.chatMessages'));

    case "users":
      return restful.serializeUsersForTroupe(troupeId, userId)
        .then(arrayToSnapshot('room.users'));

    case "events":
      return restful.serializeEventsForTroupe(troupeId, userId)
        .then(arrayToSnapshot('room.events'));

    default:
      logger.error('Unable to provide snapshot for ' + collection);
  }

  return Q.resolve();
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
        .then(arrayToSnapshot('room.chatMessages.readBy'));


    default:
      logger.error('Unable to provide snapshot for ' + collection);
  }

  return Q.resolve();
}

function populateUserUnreadItemsCollection(options) {
  var userId = options.userId;
  var match = options.match;
  var subscriptionUserId = match[1];
  var troupeId = match[2];

  if(!userId || userId !== subscriptionUserId) {
    return Q.resolve();
  }

  return restful.serializeUnreadItemsForTroupe(troupeId, userId)
    .then(arrayToSnapshot('user.room.unreadItems'));
}

// Authorize a sbscription message
// callback(err, allowAccess)
function authorizeSubscribe(message, callback) {
  var clientId = message.clientId;

  presenceService.lookupUserIdForSocket(clientId, function(err, userId, exists) {
    if(err) return callback(err);

    if(!exists) return callback({ status: 401, message: 'Socket association does not exist' });

    var match = null;

    var hasMatch = routes.some(function(route) {
      var m = route.re.exec(message.subscription);
      if(m) {
        match = { route: route, match: m };
      }
      return m;
    });

    if(!hasMatch) return callback(new StatusError(404, "Unknown subscription " + message.subscription));

    var validator = match.route.validator;
    var m = match.match;

    validator({ userId: userId, match: m, message: message, clientId: clientId })
      .nodeify(callback);
  });

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
    authorizeSubscribe(message, function(err, allowed) {
      if(err) return callback(err);

      if(!allowed) {
        return callback(new StatusError(403, "Authorisation denied."));
      }

      message._private.authorisor = {
        snapshot: message.ext && message.ext.snapshot
      };

      return callback(null, message);
    });

  },

  outgoing: function(message, req, callback) {
    var clientId = message.clientId;

    var state = message._private && message._private.authorisor;
    var snapshot = state && state.snapshot;

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

    presenceService.lookupUserIdForSocket(clientId, function(err, userId, exists) {
      if(err) callback(err);

      if(!exists) return callback(new StatusError(401, "Snapshot failed. Socket not associated"));

      var startTime = Date.now();

      populator({ userId: userId, match: m, snapshot: snapshot })
        .then(function(snapshot) {
          stats.responseTime('bayeux.snapshot.time', Date.now() - startTime);
          stats.responseTime('bayeux.snapshot.time.' + snapshot.type, Date.now() - startTime);

          if(snapshot) {
            if(!message.ext) message.ext = {};
            message.ext.snapshot = snapshot.data;
            message.ext.snapshot_meta = snapshot.meta;
          }
          return message;
        })
        .nodeify(callback);

    });

  }
});

