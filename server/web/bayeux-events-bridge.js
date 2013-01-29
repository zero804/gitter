/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var winston = require('winston');
var appEvents = require("../app-events");
var bayeux = require('./bayeux');

exports.install = function(server) {
  var bayeuxServer = bayeux.server;
  var bayeuxClient = bayeux.client;
  var bayeuxEngine = bayeux.engine;
  bayeuxServer.attach(server);

  appEvents.onDataChange2(function(data) {
    var operation = data.operation;
    var model = data.model;
    var url = data.url;

    switch(operation) {
      case 'create':
      case 'update':
      case 'remove':
        bayeuxClient.publish(url, {
          operation: operation,
          model: model
        });

        break;
      default:
        winston.error('Unknown operation', {operation: operation });
    }
  });

  appEvents.onUserRemovedFromTroupe(function(options) {
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

  appEvents.onUserNotification(function(data) {
      var userId = data.userId;
      var title = data.title;
      var text = data.text;
      var link = data.link;
      var sound = data.sound;

      var url = "/user/" + userId;

      bayeuxClient.publish(url, {
         notification: "user_notification",
         title: title,
         text: text,
         link: link,
         sound: sound
      });
  });

  appEvents.onUserLoggedIntoTroupe(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;

    bayeuxClient.publish("/troupes/" + troupeId, {
      notification: "presence",
      userId: userId,
      status: "in"
    });

  });

  appEvents.onUserLoggedOutOfTroupe(function(data) {
    var troupeId = data.troupeId;
    var userId = data.userId;

    bayeuxClient.publish("/troupes/" + troupeId, {
      notification: "presence",
      userId: userId,
      status: "out"
    });

  });

  ////////////////////

  appEvents.onTroupeUnreadCountsChange(function(data) {
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


  appEvents.onNewUnreadItem(function(data) {
    var userId = data.userId;
    var items = data.items;
  });

  appEvents.onUnreadItemsRemoved(function(data) {
    var userId = data.userId;
    var items = data.items;

    bayeuxClient.publish("/user/" + userId, {
      notification: "unread_items_removed",
      items: items
    });

  });
};

