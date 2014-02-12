/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var winston           = require('winston');
var appEvents         = require("../app-events");
var bayeux            = require('./bayeux');
var ent               = require('ent');
var presenceService   = require("../services/presence-service");
var restSerializer    = require('../serializers/rest-serializer')

exports.install = function() {
  var bayeuxClient = bayeux.client;

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

        bayeuxClient.publish(url, message);

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

      bayeuxClient.publish(url, message);
  });

  appEvents.localOnly.onUserLoggedIntoTroupe(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;

    bayeuxClient.publish("/api/v1/troupes/" + troupeId, {
      notification: "presence",
      userId: userId,
      status: "in"
    });

  });

  appEvents.localOnly.onUserLoggedOutOfTroupe(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;

    bayeuxClient.publish("/api/v1/troupes/" + troupeId, {
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

    bayeuxClient.publish("/api/v1/user/" + userId, {
      notification: "troupe_unread",
      troupeId: troupeId,
      totalUnreadItems: total
    });

  });

  appEvents.localOnly.onTroupeMentionCountsChange(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var total = data.total;
    var member = data.member;

    bayeuxClient.publish("/api/v1/user/" + userId, {
      notification: "troupe_mention",
      troupeId: troupeId,
      mentions: total
    });

    var mentionUrl = "/api/v1/user/" + userId + "/troupes";
    if(data.op === 'add' && total === 1 && !member) {
      var strategy = new restSerializer.TroupeIdStrategy({ currentUserId: userId });

      restSerializer.serializeQ(troupeId, strategy)
        .then(function(troupe) {
          // Simulate a create on the mentions resource
          bayeuxClient.publish(mentionUrl, {
            operation: 'create',
            model: troupe
          });
        });

    } else if(data.op === 'remove' && total === 0 && !member) {
      // Simulate a remove
      bayeuxClient.publish(mentionUrl, {
        operation: 'remove',
        model: {
          id: troupeId
        }
      });
    } else {
      // Just patch the mention count
      bayeuxClient.publish(mentionUrl, {
        operation: 'patch',
        model: {
          id: troupeId,
          mentions: total
        }
      });
    }

  });


  appEvents.localOnly.onNewUnreadItem(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var items = data.items;

    bayeuxClient.publish("/api/v1/user/" + userId, {
      notification: "activity",
      troupeId: troupeId
    });

    bayeuxClient.publish("/api/v1/user/" + userId + '/troupes/' + troupeId + '/unreadItems', {
      notification: "unread_items",
      items: items
    });

  });

  appEvents.localOnly.onUnreadItemsRemoved(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var items = data.items;

    bayeuxClient.publish("/api/v1/user/" + userId + '/troupes/' + troupeId + '/unreadItems', {
      notification: "unread_items_removed",
      items: items
    });

  });

};

