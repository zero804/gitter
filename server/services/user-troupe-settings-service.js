"use strict";

var persistence = require('./persistence-service');
var mongoUtils = require('../utils/mongo-utils');
var onMongoConnect = require('../utils/on-mongo-connect');
var assert = require('assert');
var Promise = require('bluebird');

exports.getUserSettings = function(userId, troupeId, settingsKey) {
  /* Not sure why mongoose isn't converting these */
  assert(mongoUtils.isLikeObjectId(userId));
  assert(mongoUtils.isLikeObjectId(troupeId));
  userId = mongoUtils.asObjectID(userId);
  troupeId = mongoUtils.asObjectID(troupeId);

  return persistence.UserTroupeSettings.findOne({ userId: userId, troupeId: troupeId }, 'settings.' + settingsKey, { lean: true })
    .exec()
    .then(function(uts) {
      if(!uts) return;
      if(!uts.settings) return;

      return uts.settings[settingsKey];
    });
};


exports.getMultiUserTroupeSettings = function(userTroupes, settingsKey) {
  if(!userTroupes.length) return Promise.resolve({});

  var terms = userTroupes.map(function(userTroupe) {
    if(!mongoUtils.isLikeObjectId(userTroupe.userId) || !mongoUtils.isLikeObjectId(userTroupe.troupeId)) return;
    var userId = mongoUtils.asObjectID(userTroupe.userId);
    var troupeId = mongoUtils.asObjectID(userTroupe.troupeId);

    return { userId: userId, troupeId: troupeId };
  }).filter(function(f) {
    return !!f;
  });

  return persistence.UserTroupeSettings.find({ $or: terms }, 'userId troupeId settings.' + settingsKey, {
      lean: true,
      slaveOk: true // This query can be run against a slave. If it's a tiny bit out of date, that shouldn't be a problem
    })
    .exec()
    .then(function(utses) {
      var hash = utses.reduce(function(memo, uts) {
        memo[uts.userId + ':' + uts.troupeId] = uts.settings && uts.settings[settingsKey];
        return memo;
      }, {});

      return hash;
    });
};

exports.getUserTroupeSettingsForUsersInTroupe = function(troupeId, settingsKey, userIds) {
  if(!userIds.length) return Promise.resolve({});

  return persistence.UserTroupeSettings.find({
      $and: [{
        troupeId: troupeId
      }, {
        userId: { $in: userIds }
      }]
    }, 'userId settings.' + settingsKey, {
      lean: true,
      slaveOk: true // This query can be run against a slave. If it's a tiny bit out of date, that shouldn't be a problem
    })
    .exec()
    .then(function(utses) {
      var hash = utses.reduce(function(memo, uts) {
        memo[uts.userId] = uts.settings && uts.settings[settingsKey];
        return memo;
      }, {});

      return hash;
    });
};


exports.getAllUserSettings = function(userId, troupeId) {
  /* Not sure why mongoose isn't converting these */
  assert(mongoUtils.isLikeObjectId(userId));
  assert(mongoUtils.isLikeObjectId(troupeId));
  userId = mongoUtils.asObjectID(userId);
  troupeId = mongoUtils.asObjectID(troupeId);

  return persistence.UserTroupeSettings.findOne({ userId: userId, troupeId: troupeId }, 'settings', { lean: true })
    .exec()
    .then(function(uts) {
      if(!uts) return;
      return uts.settings || {};
    });
};

exports.setUserSettings = function(userId, troupeId, settingsKey, settings) {
  assert(mongoUtils.isLikeObjectId(userId));
  assert(mongoUtils.isLikeObjectId(troupeId));

  userId = mongoUtils.asObjectID(userId);
  troupeId = mongoUtils.asObjectID(troupeId);

  var setOperation = { $set: { } };
  setOperation.$set['settings.' + settingsKey] = settings;

  return Promise.fromCallback(function(callback) {
    persistence.UserTroupeSettings.collection.update(
        { userId: userId, troupeId: troupeId },
        setOperation,
        { upsert: true }, callback);

  });
};

exports.setUserSettingsForUsersInTroupe = function(troupeId, userIds, settingsKey, settings) {
  if (!userIds.length) return Promise.resolve();

  return onMongoConnect()
    .then(function() {
      var bulk = persistence.UserTroupeSettings.collection.initializeUnorderedBulkOp();

      var setOperation = { $set: { } };
      setOperation.$set['settings.' + settingsKey] = settings;

      troupeId = mongoUtils.asObjectID(troupeId);

      userIds.forEach(function(userId) {
        userId = mongoUtils.asObjectID(userId);
        bulk.find({ userId: userId, troupeId: troupeId }).upsert().updateOne(setOperation);
      });

      return Promise.fromCallback(function(callback) {
        bulk.execute(callback);
      });
    });
};


// TODO: remove settings for users removed from troupes, from troupes that have been deleted etc
