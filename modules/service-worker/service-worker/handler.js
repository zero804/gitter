'use strict';

function delay(timeout) {
  return new Promise(function(resolve) {
    setTimeout(resolve, timeout);
  });
}

var responded = {};

function newChatPushHandler(event, payload) {
  var room = payload.room;
  var chats = payload.chats.slice();
  var count = 1;
  var tag = 'new_chat:' + room.id;

  function next() {
    var chat = chats.pop();
    console.log('next', responded[payload.uniqueId], chat);
    if (responded[payload.uniqueId]) return;
    if (!chat) return;
    count++;

    var fromUser = chat.fromUser;

    var body = chat.text;

    var title;
    if (room.oneToOne) {
      title = fromUser.displayName;
    } else {
      title = fromUser && (fromUser.displayName || fromUser.username) + ' 💬 ' + room.uri;
    }

    var notificationOptions = {
      body: body,
      icon: chat.fromUser && chat.fromUser.avatarUrl,
      tag: tag,
      renotify: false,
      data: payload,
      /*
      actions: [{
        action: 'mute',
        title: 'Mute'
      }, {
        action: 'reply',
        title: 'Reply'
      }]
      */
    };

    if (count === 1) {
      // Only vibrate on first notification
      notificationOptions.vibrate = [100, 90, 80];
    }

    console.log('try showNotification', Notification.permission, title, notificationOptions);
    return self.registration.showNotification(title, notificationOptions)
      .then(function(result) {
        console.log('showNotification', result);
        if (result) return;

        return delay(4000);
      })
      .then(function() {
        return next();
      })
      .catch((err) => {
        console.log('sw.js err', err, err.stack);
      })
  }

  console.log('newChatPushHandler', chats);

  return self.registration.getNotifications({ tag: tag })
    .then(function(notifications) {
      console.log('newChatPushHandler notifications', notifications, !!(notifications && notifications.length));
      // Already notifying for this room? Skip
      if (notifications && notifications.length) return;

      console.log('going to next()');
      return next();
    });


}

function newChatClickHandler(event, payload) {
  responded[payload.uniqueId] = true;

  if (payload.linkUrl) {
    return clients.openWindow(payload.linkUrl);
  }
}

function onPush(event, payload) {
  switch(payload.type) {
    case 'new_chat':
      return newChatPushHandler(event, payload);
  }
}

function onNotificationClick(event) {
  var notification = event.notification;
  notification.close();

  var payload = notification.data;
  switch(payload.type) {
    case 'new_chat':
      return newChatClickHandler(event, payload);
  }

}

module.exports = {
  onPush: onPush,
  onNotificationClick: onNotificationClick
};
