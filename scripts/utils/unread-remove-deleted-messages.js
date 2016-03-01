#!/usr/bin/env node
/*jslint node:true, unused:true */
"use strict";

var troupeService = require('../../server/services/troupe-service');
var unreadItemService = require('../../server/services/unread-items');
var roomMembershipService = require("../../server/services/room-membership-service");
var persistence = require('../../server/services/persistence-service');
var mongoUtils = require('../../server/utils/mongo-utils');
var shutdown = require('shutdown');
var Promise = require('bluebird');

// require('../../server/event-listeners').install();

var opts = require("nomnom")
  .option('uri', {
    position: 0,
    required: true,
    help: "uri of room, eg: gitterHQ/gitter"
  })
  .option('dryRun', {
    flag: true,
    help: "Dry run"
  })
  .parse();

function main(uri, dryRun) {
  return troupeService.findByUri(uri)
    .then(function(room) {
      return [room, roomMembershipService.findMembersForRoom(room._id)];
    })
    .spread(function(room, userIds) {
      console.log('QUERYING unread items for ', userIds.length, 'users');
      var allUnread = {};

      return Promise.map(userIds, function(userId) {
        return unreadItemService.getUnreadItems(userId, room._id)
          .then(function(items) {
            items.forEach(function(chatId) {
              allUnread[chatId] = true;
            });
          })
      }, { concurrency: 5 })
      .then(function() {
        return [room, allUnread];
      });
    })
    .spread(function(room, allUnreadHash) {
      var ids = mongoUtils.asObjectIDs(Object.keys(allUnreadHash));
      console.log('SEARCHING FOR ', ids.length, 'chat messages');
      return persistence.ChatMessage.find({ _id: { $in: ids }}, { _id: 1})
        .lean(true)
        .exec()
        .then(function(chats) {
          chats.forEach(function(chat) {
            delete allUnreadHash[chat._id.toString()];
          });
          var missingIds = Object.keys(allUnreadHash);
          console.log('MISSING: ', missingIds);

          if (dryRun || !missingIds.length) return;

          return Promise.map(missingIds, function(itemId) {
            console.log('REMOVING ', itemId);
            // Remove the items, slowly
            return unreadItemService.testOnly.removeItem(room.id, itemId)
              .delay(10);
          }, { concurrency: 1 });
        });
    });

}

main(opts.uri, opts.dryRun)
  .delay(1000)
  .catch(function(err) {
    console.error(err.stack);
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
