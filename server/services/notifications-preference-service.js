/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require("./persistence-service");
var Q           = require('q');

function optOut(userId, notificationType, callback) {

  var setOp = {};
  setOp['optOut.' + notificationType] = true;

  return Q.all([
    persistence.NotificationsPreference.findOneAndUpdateQ(
      { userId: userId },
      { $set: setOp },
      { upsert: true }),
    ])
    .nodeify(callback);
}

function optIn(userId, notificationType, callback) {

  var setOp = {};
  setOp['optIn.' + notificationType] = true;

  return Q.all([
    persistence.NotificationsPreference.findOneAndUpdateQ(
      { userId: userId },
      { $set: setOp },
      { upsert: true }),
    ])
    .nodeify(callback);
}

function verifyUserExpectsNotifications(userId, notificationType, callback) {

  //return Q.all([
  //  persistence.NotificationsPreference.findOneQ({userId: userId})
  //]).then(function(preferences) {
  //  return (preferences ? !!preferences.optOut[notificationType] : false);
  //})
  //.nodeify(callback);

  persistence.NotificationsPreference.findOne({userId: userId}, function(err, preferences) {
    var pref = (preferences ? !!preferences.optOut[notificationType] : false);
    callback(pref);
  });
}


module.exports = {
  optOut: optOut,
  optIn:  optIn,
  verifyUserExpectsNotifications: verifyUserExpectsNotifications
};
