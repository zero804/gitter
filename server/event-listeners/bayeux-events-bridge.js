"use strict";

var winston           = require('../utils/winston');
var appEvents         = require('gitter-web-appevents');
var bayeux            = require('../web/bayeux');
var ent               = require('ent');
var presenceService   = require("gitter-web-presence");
var restSerializer    = require('../serializers/rest-serializer');
var debug             = require('debug')('gitter:bayeux-events-bridge');

function findFailbackChannel(channel) {
  var res = [
    /^\/api\/v1\/rooms\//,
    /^\/api\/v1\/user\/\w+\/rooms\//
  ];

  for(var i = 0; i < res.length; i++) {
    var m = channel.match(res[i]);
    if(m) return channel.replace(/\/rooms\//, '/troupes/');  // Consider dropping this soon
  }
}

var installed = false;

exports.install = function() {
  if (installed) return;
  installed = true;

  function publish(channel, message) {
    debug("Publish on %s: %j", channel, message);

    bayeux.publish(channel, message);

    var failbackChannel = findFailbackChannel(channel);

    if(failbackChannel) {
      bayeux.publish(failbackChannel, message);
    }
  }

  appEvents.onDataChange2(function(data) {

    var operation = data.operation;
    var model = data.model;
    var url = "/api/v1" + data.url;

    switch(operation) {
      case 'create':
      case 'patch':
      case 'update':
      case 'remove':
        var message = {
          operation: operation,
          model: model
        };

        publish(url, message);

        break;
      default:
        winston.error('Unknown operation', { operation: operation });
    }
  });

  appEvents.onUserRemovedFromTroupe(function(options) {
    var userId = options.userId;
    var troupeId = options.troupeId;

    presenceService.findAllSocketsForUserInTroupe(userId, troupeId, function(err, socketIds) {
      if(err) return winston.error('Error while attempting to disconnect user from troupe' + err, { exception: err });

      if(!socketIds || !socketIds.length) return;

      socketIds.forEach(function(clientId) {

        bayeux.destroyClient(clientId, function() {
          winston.info("Destroyed client " + clientId + " as user was disconnected from troupe");
        });

      });

    });

  });

  appEvents.onUserNotification(function(data) {
      var userId = data.userId;
      var title = data.title;
      var text = data.text;
      var link = data.link;
      var troupeId = data.troupeId;
      var sound = data.sound;
      var chatId = data.chatId;

      var url = "/api/v1/user/" + userId;
      var message = {
         notification: "user_notification",
         title: title,
         text: ent.decode(text),
         link: link,
         troupeId: troupeId,
         sound: sound,
         chatId: chatId
      };
      debug("Notification to %s: %j", url, message);

      publish(url, message);
  });

  appEvents.onUserLoggedIntoTroupe(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;

    publish("/api/v1/rooms/" + troupeId, {
      notification: "presence",
      userId: userId,
      status: "in"
    });

  });

  appEvents.onUserLoggedOutOfTroupe(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;

    publish("/api/v1/rooms/" + troupeId, {
      notification: "presence",
      userId: userId,
      status: "out"
    });

  });

  ////////////////////

  appEvents.onTroupeUnreadCountsChange(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var total = data.total;
    var mentions = data.mentions;

    // TODO: this is deprecated but still used by the OSX client
    publish("/api/v1/user/" + userId, {
      notification: "troupe_unread",
      troupeId: troupeId,
      totalUnreadItems: total,
      DEPRECATED: true
    });

    if(mentions >= 0) {
      // TODO: this is deprecated but still used by the OSX client
      publish("/api/v1/user/" + userId, {
        notification: "troupe_mention",
        troupeId: troupeId,
        mentions: mentions,
        DEPRECATED: true
      });
    }

    var url = "/api/v1/user/" + userId + "/rooms";
    var message = {
      operation: 'patch',
      model: {
        id: troupeId,
        unreadItems: total,
        mentions: mentions
      }
    };

    // Just patch the mention count
    publish(url, message);

  });

  appEvents.onUserMentionedInNonMemberRoom(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;

    // User is not a member of the room but they're just been mentioned.
    // We need to send them a create to add the room to their collection
    var strategy = new restSerializer.TroupeIdStrategy({ currentUserId: userId });

    var mentionUrl = "/api/v1/user/" + userId + "/rooms";

    restSerializer.serialize(troupeId, strategy)
      .then(function(troupe) {
        // Simulate a create on the mentions resource
        publish(mentionUrl, {
          operation: 'create',
          model: troupe
        });
      });
  });

  appEvents.onNewLurkActivity(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;

    publish("/api/v1/user/" + userId, {
      notification: "activity",
      troupeId: troupeId
    });

  });

  appEvents.onNewUnreadItem(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var items = data.items;
    var isOnline = data.online;

    // This event gets triggered for offline users too,
    // but we can ignore them
    if (!isOnline) return;

    publish("/api/v1/user/" + userId + '/rooms/' + troupeId + '/unreadItems', {
      notification: "unread_items",
      items: items
    });

  });

  appEvents.onUnreadItemsRemoved(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var items = data.items;

    publish("/api/v1/user/" + userId + '/rooms/' + troupeId + '/unreadItems', {
      notification: "unread_items_removed",
      items: items
    });

  });

  appEvents.onUserTroupeLurkModeChange(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var lurk = data.lurk;

    publish("/api/v1/user/" + userId + '/rooms/' + troupeId + '/unreadItems', {
      notification: "lurk_change",
      lurk: lurk
    });

  });


  appEvents.onMarkAllRead(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;

    publish("/api/v1/user/" + userId + '/rooms/' + troupeId + '/unreadItems', {
      notification: "mark_all_read"
    });

  });
};
