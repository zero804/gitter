"use strict";

var winston        = require('../utils/winston');
var Q              = require('q');
var restSerializer = require('../serializers/rest-serializer');
var appEvents      = require('gitter-web-appevents');
var debug          = require('debug')('gitter:live-collection-events');

/**
 * Serialize a model
 **/
function serializeEvent(url, operation, model, callback) {
  debug("Serializing %s to %s", operation, url);

  return restSerializer.serializeModel(model)
    .then(function(serializedModel) {
      appEvents.dataChange2(url, operation, serializedModel);
    })
    .fail(function(err) {
      winston.error("Silently failing model event: ", { exception: err, url: url, operation: operation });
    })
    .nodeify(callback);
}
exports.serializeEvent = serializeEvent;

function serializeRemove(url, id) {
  appEvents.dataChange2(url, "remove", { id: id });
}

/*
 * Specialized version for one-to-one rooms
 */
function serializeOneToOneTroupeEvent(userId, operation, model, callback) {
  var oneToOneUserUrl = '/user/' + userId + '/rooms';

  var strategy = new restSerializer.TroupeStrategy({ currentUserId: userId });

  return restSerializer.serialize(model, strategy)
    .then(function(serializedModel) {
      appEvents.dataChange2(oneToOneUserUrl, operation, serializedModel);
    })
    .nodeify(callback);
}
exports.serializeOneToOneTroupeEvent = serializeOneToOneTroupeEvent;

/**
 * Called when a user is added to a room
 */
function serializeUserAddedToRoom(room, troupeUser) {
  var url = "/rooms/" + room.id + "/users";
  var userUrl = "/user/" + troupeUser.userId + "/rooms";

  return Q.all([
    serializeEvent(url, "create", troupeUser),
    serializeEvent(userUrl, "create", room)
  ]);
}
exports.serializeUserAddedToRoom = serializeUserAddedToRoom;

/**
 * Handles one-to-one and non-one-to-ones
 */
function serializeUserRemovedFromRoom(room, userId) {
  if(!room.oneToOne) {
    return serializeUserRemovedFromGroupRoom(room.id, userId);
  } else {
    /* One to one */
    return serializeOneToOneTroupeEvent(userId, "remove", room);
  }

}
exports.serializeUserRemovedFromRoom = serializeUserRemovedFromRoom;

/*
 * Specifically not a group room
 */
function serializeUserRemovedFromGroupRoom(roomId, userId) {
  /* Dont mark the user as having been removed from the room */
  serializeRemove('/rooms/' + roomId + '/users', userId);
  serializeRemove('/user/' + userId + '/rooms', roomId);

  // TODO: move this in a remove listener somewhere else in the codebase
  appEvents.userRemovedFromTroupe({ troupeId: roomId, userId: userId });
  return Q.resolve();
}
exports.serializeUserRemovedFromGroupRoom = serializeUserRemovedFromGroupRoom;
