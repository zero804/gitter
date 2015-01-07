/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var winston           = require('../utils/winston');
var appEvents         = require("../app-events");
var bayeux            = require('./bayeux');
var ent               = require('ent');
var presenceService   = require("../services/presence-service");
var restSerializer    = require('../serializers/rest-serializer');


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

exports.install = function() {
  var bayeuxClient = bayeux.client;

  function publish(channel, message) {
    bayeuxClient.publish(channel, message);

    var failbackChannel = findFailbackChannel(channel);

    if(failbackChannel) {
      bayeuxClient.publish(failbackChannel, message);
    }
  }

  appEvents.localOnly.onDataChange2(function(data) {

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

  appEvents.localOnly.onUserRemovedFromTroupe(function(options) {
    var userId = options.userId;
    var troupeId = options.troupeId;

    presenceService.findAllSocketsForUserInTroupe(userId, troupeId, function(err, socketIds) {
      if(err) return winston.error('Error while attempting to disconnect user from troupe' + err, { exception: err });

      if(!socketIds || !socketIds.length) return;

      socketIds.forEach(function(clientId) {

        bayeux.engine.destroyClient(clientId, function() {
          winston.info("Destroyed client " + clientId + " as user was disconnected from troupe");
        });

      });

    });

  });

  appEvents.localOnly.onUserNotification(function(data) {
      var userId = data.userId;
      var title = data.title;
      var text = data.text;
      var link = data.link;
      var troupeId = data.troupeId;
      var sound = data.sound;

      var url = "/api/v1/user/" + userId;
      var message = {
         notification: "user_notification",
         title: title,
         text: ent.decode(text),
         link: link,
         troupeId: troupeId,
         sound: sound
      };
      winston.verbose("Notification to " + url, message);

      publish(url, message);
  });

  appEvents.localOnly.onUserLoggedIntoTroupe(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;

    publish("/api/v1/rooms/" + troupeId, {
      notification: "presence",
      userId: userId,
      status: "in"
    });

  });

  appEvents.localOnly.onUserLoggedOutOfTroupe(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;

    publish("/api/v1/rooms/" + troupeId, {
      notification: "presence",
      userId: userId,
      status: "out"
    });

  });

  ////////////////////

  appEvents.localOnly.onTroupeUnreadCountsChange(function(data) {
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

  appEvents.localOnly.onUserMentionedInNonMemberRoom(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;

    // User is not a member of the room but they're just been mentioned.
    // We need to send them a create to add the room to their collection
    var strategy = new restSerializer.TroupeIdStrategy({ currentUserId: userId });

    var mentionUrl = "/api/v1/user/" + userId + "/rooms";

    restSerializer.serializeQ(troupeId, strategy)
      .then(function(troupe) {
        // Simulate a create on the mentions resource
        publish(mentionUrl, {
          operation: 'create',
          model: troupe
        });
      });
  });

  appEvents.localOnly.onNewLurkActivity(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;

    publish("/api/v1/user/" + userId, {
      notification: "activity",
      troupeId: troupeId
    });

  });

  appEvents.localOnly.onNewUnreadItem(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var items = data.items;

    // This should only be for lurking users
    // publish("/api/v1/user/" + userId, {
    //   notification: "activity",
    //   troupeId: troupeId
    // });

    publish("/api/v1/user/" + userId + '/rooms/' + troupeId + '/unreadItems', {
      notification: "unread_items",
      items: items
    });

  });

  appEvents.localOnly.onUnreadItemsRemoved(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var items = data.items;

    publish("/api/v1/user/" + userId + '/rooms/' + troupeId + '/unreadItems', {
      notification: "unread_items_removed",
      items: items
    });

  });

  appEvents.localOnly.onUserTroupeLurkModeChange(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var lurk = data.lurk;

    publish("/api/v1/user/" + userId + '/rooms/' + troupeId + '/unreadItems', {
      notification: "lurk_change",
      lurk: lurk
    });

  });


  appEvents.localOnly.onMarkAllRead(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;

    publish("/api/v1/user/" + userId + '/rooms/' + troupeId + '/unreadItems', {
      notification: "mark_all_read"
    });

  });
};

