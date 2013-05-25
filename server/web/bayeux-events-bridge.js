/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var winston = require('winston');
var appEvents = require("../app-events");
var bayeux = require('./bayeux');

exports.install = function() {
  var bayeuxClient = bayeux.client;
  var bayeuxEngine = bayeux.engine;

  appEvents.localOnly.onDataChange2(function(data) {

    var operation = data.operation;
    var model = data.model;
    var url = "" + data.url;

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
        winston.error('Unknown operation', {operation: operation });
    }
  });

/**
TODO: disconnect clients who've been removed from a troupe
  appEvents.localOnly.onUserRemovedFromTroupe(function(options) {
    var userId = options.userId;
    // TODO: disconnect only those subscriptions specific to the troupe
    // var troupeId = options.troupeId;

    bayeux.clientUserLookup.lookupClientIdsForUserId(userId, function(err, clientIds) {
      if(err) { winston.error("Unable to lookup clientIds for userId"); return; }
      if(clientIds) {
        winston.info("Detected user has been removed from troupe. Disconnecting from " + clientIds.length + " faye connections");

        clientIds.forEach(function(clientId) {
          bayeuxEngine.destroyClient(clientId, function() {
            winston.info("Destroyed client " + clientId);
          });
        });
      }
    });

  });
**/

  appEvents.localOnly.onUserNotification(function(data) {
      var userId = data.userId;
      var title = data.title;
      var text = data.text;
      var link = data.link;
      var troupeId = data.troupeId;
      var sound = data.sound;

      var url = "/user/" + userId;
      var message = {
         notification: "user_notification",
         title: title,
         text: text,
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

    bayeuxClient.publish("/troupes/" + troupeId, {
      notification: "presence",
      userId: userId,
      status: "in"
    });

  });

  appEvents.localOnly.onUserLoggedOutOfTroupe(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;

    bayeuxClient.publish("/troupes/" + troupeId, {
      notification: "presence",
      userId: userId,
      status: "out"
    });

  });

  ////////////////////

  appEvents.localOnly.onTroupeUnreadCountsChange(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var counts = data.counts;
    var total = Object.keys(counts)
                  .map(function(key) { return counts[key]; })
                  .reduce(function(a, b) { return a + b; });

    bayeuxClient.publish("/user/" + userId, {
      notification: "troupe_unread",
      troupeId: troupeId,
      totalUnreadItems: total,
      counts: counts
    });

  });


  appEvents.localOnly.onNewUnreadItem(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var items = data.items;

    bayeuxClient.publish("/user/" + userId + '/troupes/' + troupeId, {
      notification: "unread_items",
      items: items
    });

  });

  appEvents.localOnly.onUnreadItemsRemoved(function(data) {
    var userId = data.userId;
    var troupeId = data.troupeId;
    var items = data.items;

    bayeuxClient.publish("/user/" + userId + '/troupes/' + troupeId, {
      notification: "unread_items_removed",
      items: items
    });

  });
};

