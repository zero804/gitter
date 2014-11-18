/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var gcm = require('node-gcm');

var MAX_RETRIES = 4;

var sender = new gcm.Sender('AIzaSyDqtgtECRTUmyX7SZK6bllu_Gd9ySc_Oxs');

var sendNotificationToDevice = function(notification, badge, device, callback) {
  if(!notification) {
    // badge only notifications are pointless for android as the apps dont have badges
    return callback();
  }

  var message = new gcm.Message({
    data: {
      id: notification.roomId,
      name: notification.roomName,
      message: notification.message
    }
  });

  sender.send(message, [device.deviceId], MAX_RETRIES, callback);
};

module.exports.sendNotificationToDevice = sendNotificationToDevice;
