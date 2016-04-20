"use strict";

var env               = require('gitter-web-env');
var nconf             = env.config;
var winston           = env.logger;
var statsd            = env.createStatsClient({ prefix: nconf.get('stats:statsd:prefix')});
var appEvents         = require('gitter-web-appevents');
var bayeux            = require('../web/bayeux');
var ent               = require('ent');
var presenceService   = require("gitter-web-presence");
var restSerializer    = require('../serializers/rest-serializer');
var debug             = require('debug')('gitter:bayeux-events-bridge');

var useDeprecatedChannels = nconf.get('ws:useDeprecatedChannels');

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

  function publish(channel, message, channelType, operation, modelType) {
    debug("Publish on %s: %j", channel, message);

    var tags = ['channelType:' + channelType];
    if (operation) {
      tags.push('operation:' + operation);
    }
    if (modelType) {
      tags.push('modelType:' + modelType);
    }
    statsd.increment('bayeux.publish', 1, 0.1, tags);

    bayeux.publish(channel, message);

    if (useDeprecatedChannels) {
      // TODO: remove this fallback channel
      var failbackChannel = findFailbackChannel(channel);

      if(failbackChannel) {
        bayeux.publish(failbackChannel, message);
      }
    }
  }

  appEvents.onDataChange2(function(data) {

    var operation = data.operation;
    var model = data.model;
    var url = "/api/v1" + data.url;
    var type = data.type;

    switch(operation) {
      case 'create':
      case 'patch':
      case 'update':
      case 'remove':
        var message = {
          operation: operation,
          model: model
        };

        publish(url, message, 'dataChange2', operation, type);

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
      var icon = data.icon;
      var troupeId = data.troupeId;
      var sound = data.sound;
      var chatId = data.chatId;

      var url = "/api/v1/user/" + userId;
      var message = {
         notification: "user_notification",
         title: title,
         text: ent.decode(text),
         link: link,
         icon: icon,
         troupeId: troupeId,
         sound: sound,
         chatId: chatId
      };
      debug("Notification to %s: %j", url, message);

      publish(url, message, 'onUserNotification');
  });

  // When a user's eyeballs changes to on or off...
  presenceService.on('presenceChange', function(userId, troupeId, presence) {
    publish("/api/v1/rooms/" + troupeId, {
      notification: "presence",
      userId: userId,
      status: presence ? "in" : "out"
    }, 'presenceChange');
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
    }, 'troupeUnreadCountsChangeA');

    if(mentions >= 0) {
      // TODO: this is deprecated but still used by the OSX client
      publish("/api/v1/user/" + userId, {
        notification: "troupe_mention",
        troupeId: troupeId,
        mentions: mentions,
        DEPRECATED: true
      }, 'troupeUnreadCountsChangeB');
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
    publish(url, message, 'troupeUnreadCountsChange');

  });

  appEvents.onUserMentionedInNonMemberRoom(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;

    // User is not a member of the room but they're just been mentioned.
    // We need to send them a create to add the room to their collection
    var strategy = new restSerializer.TroupeIdStrategy({ currentUserId: userId });

    var mentionUrl = "/api/v1/user/" + userId + "/rooms";

    restSerializer.serializeObject(troupeId, strategy)
      .then(function(troupe) {
        // Simulate a create on the mentions resource
        publish(mentionUrl, {
          operation: 'create',
          model: troupe
        }, 'userMentionedInNonMemberRoom');
      });
  });

  appEvents.onNewLurkActivity(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;

    publish("/api/v1/user/" + userId, {
      notification: "activity",
      troupeId: troupeId
    }, 'newLurkActivity');

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
    }, 'newUnreadItem');

  });

  appEvents.onUnreadItemsRemoved(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var items = data.items;

    publish("/api/v1/user/" + userId + '/rooms/' + troupeId + '/unreadItems', {
      notification: "unread_items_removed",
      items: items
    }, 'unreadItemsRemoved');

  });

  appEvents.onUserTroupeLurkModeChange(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var lurk = data.lurk;

    publish("/api/v1/user/" + userId + '/rooms/' + troupeId + '/unreadItems', {
      notification: "lurk_change",
      lurk: lurk
    }, 'userTroupeLurkModeChange');

  });


  appEvents.onMarkAllRead(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;

    publish("/api/v1/user/" + userId + '/rooms/' + troupeId + '/unreadItems', {
      notification: "mark_all_read"
    }, 'markAllRead');

  });
};
