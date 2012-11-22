/*jslint node: true */
"use strict";

var PushNotificationDevice = require("./persistence-service").PushNotificationDevice;
var winston = require("winston");

exports.registerAppleDevice = function(deviceId, deviceToken, callback) {
  PushNotificationDevice.findOneAndUpdate(
    { deviceId: deviceId },
    { deviceId: deviceId, appleToken: deviceToken, deviceType: 'APPLE' },
    { upsert: true },
    callback);
};

exports.registerAppleUser = function(deviceId, userId, callback) {
  PushNotificationDevice.findOneAndUpdate(
    { deviceId: deviceId },
    { deviceId: deviceId, userId: userId, deviceType: 'APPLE' },
    { upsert: true },
    callback);
};

exports.findDevicesForUser = function(userId, callback) {
  PushNotificationDevice.find({ userId: userId }, callback);
};
