/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env               = require('../../utils/env');
var logger            = env.logger;

var troupeService     = require('../../services/troupe-service');
var presenceService   = require('../../services/presence-service');
var restful           = require('../../services/restful');
var mongoUtils        = require('../../utils/mongo-utils');
var StatusError       = require('statuserror');
var bayeuxExtension   = require('./extension');


// Strategies for authenticating that a user can subscribe to the given URL
var routes = [
  { re: /^\/api\/v1\/(?:troupes|rooms)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription },
  { re: /^\/api\/v1\/(?:troupes|rooms)\/(\w+)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription,
    populator: populateSubTroupeCollection },
  { re: /^\/api\/v1\/(?:troupes|rooms)\/(\w+)\/(\w+)\/(\w+)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription,
    populator: populateSubSubTroupeCollection },
  { re: /^\/api\/v1\/user\/(\w+)\/(\w+)$/,
    validator: validateUserForUserSubscription,
    populator: populateSubUserCollection },
  { re: /^\/api\/v1\/user\/(\w+)\/(?:troupes|rooms)\/(\w+)\/unreadItems$/,
    validator: validateUserForUserSubscription,
    populator: populateUserUnreadItemsCollection },
  { re: /^\/api\/v1\/user\/(\w+)$/,
    validator: validateUserForUserSubscription },
  { re: /^\/api\/v1\/ping(\/\w+)?$/,
    validator: validateUserForPingSubscription }
];

function checkTroupeAccess(userId, troupeId, callback) {
  // TODO: use the room permissions model
  return troupeService.findById(troupeId)
    .then(function(troupe) {
      if(!troupe) return false;

      if(troupe.security === 'PUBLIC') {
        return true;
      }

      // After this point, everything needs to be authenticated
      if(!userId) {
        return false;
      }

      var result = troupeService.userIdHasAccessToTroupe(userId, troupe);

      if(!result) {
        logger.info("Denied user " + userId + " access to troupe " + troupe.uri);
        return false;
      }

      return result;
    })
    .nodeify(callback);
}

// This strategy ensures that a user can access a URL under a troupe URL
function validateUserForSubTroupeSubscription(options, callback) {
  var userId = options.userId;
  var match = options.match;

  var troupeId = match[1];

  if(!mongoUtils.isLikeObjectId(troupeId)) {
    return callback(new StatusError(400, 'Invalid ID: ' + troupeId));
  }

  return checkTroupeAccess(userId, troupeId)
    .nodeify(callback);
}

// This is only used by the native client. The web client publishes to
// the url
function validateUserForPingSubscription(options, callback) {
  return callback(null, true);
}

// This strategy ensures that a user can access a URL under a /user/ URL
function validateUserForUserSubscription(options, callback) {
  var userId = options.userId;
  var match = options.match;
  var subscribeUserId = match[1];

  // All /user/ subscriptions need to be authenticated
  if(!userId) return false;

  if(!mongoUtils.isLikeObjectId(userId)) {
    return callback(new StatusError(400, 'Invalid ID: ' + userId));
  }

  var result = userId == subscribeUserId;

  return callback(null, result);
}

function populateSubUserCollection(options, callback) {
  var userId = options.userId;
  var match = options.match;
  var subscribeUserId = match[1];
  var collection = match[2];

  // All /user/ subscriptions need to be authenticated
  if(!userId) return false;

  if(userId != subscribeUserId) {
    return callback(null, [ ]);
  }

  switch(collection) {
    case "rooms":
    case "troupes":
      return restful.serializeTroupesForUser(userId, callback);

    default:
      logger.error('Unable to provide snapshot for ' + collection);
  }

  callback(null, [ ]);
}


function populateSubTroupeCollection(options, callback) {
  var userId = options.userId;
  var match = options.match;
  var troupeId = match[1];
  var collection = match[2];

  switch(collection) {
    case "chatMessages":
      return restful.serializeChatsForTroupe(troupeId, userId, callback);

    case "users":
      return restful.serializeUsersForTroupe(troupeId, userId, callback);

    case "events":
      return restful.serializeEventsForTroupe(troupeId, userId, callback);

    default:
      logger.error('Unable to provide snapshot for ' + collection);
  }

  callback(null, [ ]);
}

function populateSubSubTroupeCollection(options, callback) {
  var match = options.match;
  var troupeId = match[1];
  var collection = match[2];
  var subId = match[3];
  var subCollection = match[4];

  switch(collection + '-' + subCollection) {
    case "chatMessages-readBy":
      return restful.serializeReadBysForChat(troupeId, subId, callback);

  }

  callback(null, [ ]);
}

function populateUserUnreadItemsCollection(options, callback) {
  var userId = options.userId;
  var match = options.match;
  var subscriptionUserId = match[1];
  var troupeId = match[2];

  if(userId !== subscriptionUserId) {
    return callback(null, [ ]);
  }

  return restful.serializeUnreadItemsForTroupe(troupeId, userId, callback);
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

    if(!hasMatch) return callback({ status: 404, message: "Unknown subscription" });

    var validator = match.route.validator;
    var m = match.match;

    validator({ userId: userId, match: m, message: message, clientId: clientId }, callback);
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
  incoming: function(message, req, callback) {
    var snapshot = 1;
    if(message.ext && message.ext.snapshot === false) {
      snapshot = 0;
    }

    // Do we allow this user to connect to the requested channel?
    authorizeSubscribe(message, function(err, allowed) {
      if(err) return callback(err);

      if(!allowed) {
        return callback({ status: 403, message: "Authorisation denied."});
      }

      message.id = [message.id || '', snapshot].join(':');

      return callback(null, message);
    });

  },

  outgoing: function(message, req, callback) {
    var clientId = message.clientId;

    var parts = message.id && message.id.split(':');
    if(!parts || parts.length !== 2) return callback(null, message);

    message.id = parts[0] || undefined;
    var snapshot = parseInt(parts[1], 10) === 1;

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
    if(!clientId || !populator || !snapshot) return callback(null, message);

    presenceService.lookupUserIdForSocket(clientId, function(err, userId, exists) {
      if(err) callback(err);

      if(!exists) return callback({ status: 401, message: "Snapshot failed. Socket not associated" });

      populator({ userId: userId, match: m }, function(err, data) {
        if(!message.ext) message.ext = {};
        message.ext.snapshot = data;
        return callback(null, message);
      });

    });

  }
});
