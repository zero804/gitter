'use strict';

var notificationMessageGenerator = require('../../services/notifications/notification-message-generator');

function generateNewChatNotifications(notificationType, notificationDetails/*, device*/) {
  var room = notificationDetails.room;
  var chats = notificationDetails.chats;
  var message = notificationMessageGenerator(room, chats);

  return {
    type: notificationType,
    message: message
  }
}

function generateNotifications(notificationType, notificationDetails, device) {
  switch(notificationType) {
    case 'new_chat':
      return generateNewChatNotifications(notificationType, notificationDetails, device);
  }

}

module.exports = generateNotifications;
