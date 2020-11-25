'use strict';

var UserIdStrategy = require('gitter-web-user-serialization/lib/notifications/user-id-strategy');
const {
  transformVirtualUserIntoMockedFromUser
} = require('gitter-web-users/lib/virtual-user-service');
const getProfileUrlFromVirtualUser = require('gitter-web-shared/get-profile-url-from-virtual-user');

function ChatStrategy(options) {
  if (!options) options = {};

  var userStategy = new UserIdStrategy(options);

  this.preload = function(items) {
    var users = items.map(function(i) {
      return i.fromUserId;
    });

    return userStategy.preload(users);
  };

  this.map = function(item) {
    const serializedData = {
      id: item._id,
      text: item.text,
      html: item.html,
      sent: item.sent,
      mentions: item.mentions
    };

    if (item.virtualUser) {
      serializedData.virtualUser = {
        type: item.virtualUser.type,
        externalId: item.virtualUser.externalId,
        displayName: item.virtualUser.displayName,
        avatarUrl: item.virtualUser.avatarUrl,

        // Used for the templates
        isMatrix: item.virtualUser.type === 'matrix',
        profileUrl: getProfileUrlFromVirtualUser(item.virtualUser)
      };

      serializedData.fromUser = transformVirtualUserIntoMockedFromUser(item.virtualUser);
    } else if (options.user) {
      serializedData.fromUser = options.user;
    } else {
      serializedData.fromUser = userStategy.map(item.fromUserId);
    }

    return serializedData;
  };
}

ChatStrategy.prototype = {
  name: 'ChatStrategy'
};

module.exports = ChatStrategy;
