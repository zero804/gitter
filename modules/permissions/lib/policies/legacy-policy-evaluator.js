'use strict';

var Promise = require('bluebird');
var userCanAccessRoom = require('../user-can-access-room');
var roomPermissionsModel = require('../room-permissions-model');
var persistence = require('gitter-web-persistence');
var debug = require('debug')('gitter:permissions:legacy-evaluator');

function LegacyPolicyEvaluator(userId, user, roomId, room) {
  this._userId = userId;
  if (this._userId) {
    this._userPromise = user && Promise.resolve(user);
  } else {
    // No userId, so user is always null
    this._userPromise = Promise.resolve(null);
  }

  this._roomId = roomId;
  this._roomPromise = room && Promise.resolve(room);

  this._canRead = null;
  this._canWrite = null;
  this._canJoin = null;
  this._canAdmin = null;
  this._canAddUser = null;
}

LegacyPolicyEvaluator.prototype = {
  canRead: Promise.method(function() {
    if (this._canRead) return this._canRead;

    debug('Will perform canRead');

    this._canRead = userCanAccessRoom.permissionToRead(this._userId, this._roomId);

    if (debug.enabled) {
      this._canRead.tap(function(result) {
        debug('canRead? %s', result);
      })
    }

    return this._canRead;
  }),

  canWrite: Promise.method(function() {
    if (this._canWrite) return this._canWrite;

    debug('Will perform canWrite');

    this._canWrite = userCanAccessRoom.permissionToWrite(this._userId, this._roomId);

    if (debug.enabled) {
      this._canWrite.tap(function(result) {
        debug('canWrite? %s', result);
      })
    }

    return this._canWrite;
  }),

  /**
   * Similar to canRead, but with a full access check
   */
  canJoin: Promise.method(function() {
    if (this._canJoin) return this._canJoin;

    debug('Will perform canJoin');

    this._canJoin = Promise.join(
      this._fetchUser(),
      this._fetchRoom(),
      function(user, room) {
        return roomPermissionsModel(user, 'join', room);
      });

    if (debug.enabled) {
      this._canJoin.tap(function(result) {
        debug('canJoin? %s', result);
      })
    }

    return this._canJoin;
  }),

  canAdmin: Promise.method(function() {
    if (this._canAdmin) return this._canAdmin;

    debug('Will perform canAdmin');

    this._canAdmin = Promise.join(
      this._fetchUser(),
      this._fetchRoom(),
      function(user, room) {
        return roomPermissionsModel(user, 'admin', room);
      });

    if (debug.enabled) {
      this._canAdmin.tap(function(result) {
        debug('canAdmin? %s', result);
      })
    }

    return this._canAdmin;
  }),

  canAddUser: Promise.method(function() {
    if (this._canAddUser) return this._canAddUser;

    debug('Will perform canAddUser');

    this._canAddUser = Promise.join(
      this._fetchUser(),
      this._fetchRoom(),
      function(user, room) {
        return roomPermissionsModel(user, 'adduser', room);
      });

    if (debug.enabled) {
      this._canAddUser.tap(function(result) {
        debug('canAddUser? %s', result);
      })
    }

    return this._canAddUser;
  }),

  _fetchUser: function() {
    if (this._userPromise) return this._userPromise;

    this._userPromise = persistence.User.findById(this._userId, null, { lean: true })
      .exec();

    return this._userPromise;
  },

  _fetchRoom: function() {
    if (this._roomPromise) return this._roomPromise;

    this._roomPromise = persistence.Troupe.findById(this._roomId, null, { lean: true })
      .exec();

    return this._roomPromise;
  }


};

module.exports = LegacyPolicyEvaluator;
