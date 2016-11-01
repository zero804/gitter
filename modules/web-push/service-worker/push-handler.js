'use strict';

function newChatNoficationHandler(event, payload) {
  var notificationTitle = 'Hello';
  var notificationOptions = {
    body: 'Thanks for sending this push msg.',
    badge: '/_s/l/images/screenshot.png',
    icon: '/_s/l/images/screenshot.png',
    tag: 'simple-push-demo-notification',
    sound: '/_s/l/sounds/newChat.mp3',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    data: {
      url: 'https://developers.google.com/web/fundamentals/getting-started/push-notifications/',
    },
    actions: [{
      action: 'mute',
      title: 'Mute'
    }, {
      action: 'reply',
      title: 'Reply'
    }]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
}

function pushHandler(event, payload) {
  switch(payload.type) {
    case 'new_chat':
      return newChatNoficationHandler(event, payload);
  }
}

module.exports = pushHandler;
