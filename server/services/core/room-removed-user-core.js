"use strict";

var Promise = require('bluebird');
var TroupeRemovedUser = require('gitter-web-persistence').TroupeRemovedUser;
var debug = require('debug')('gitter:app:removed-user-core');
var _ = require('lodash');

function addRemovedUser(roomId, userId) {
  debug('Recording user as removed from room userId=%s, roomId=%s', userId, roomId);
  var now = Date.now();
  return TroupeRemovedUser.create({ troupeId: roomId, userId: userId, date: now });
}

function addRemovedUsers(roomId, userIds) {
  if (!userIds || !userIds.length) return;
  
  var now = Date.now();
  debug('Recording %s users as removed from room roomId=%s', userIds.length, roomId);

  var docs = _.map(userIds, function(userId) {
    return { troupeId: roomId, userId: userId, date: now };
  });

  return TroupeRemovedUser.insertMany(docs);
}

module.exports = {
  addRemovedUser: Promise.method(addRemovedUser),
  addRemovedUsers: Promise.method(addRemovedUsers)
}
