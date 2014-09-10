/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var collapsedChatsService = require('../../services/collapsed-chats-service');
var StatusError = require('statuserror');

module.exports = {
  id: 'collapsedItem',
  index: function(req, res, next) {
    var userId = req.resourceUser.id;
    var roomId = req.userTroupe.id;

    return collapsedChatsService.getHash(userId, roomId)
      .then(function(hash) {
        res.send(Object.keys(hash));
      })
      .fail(next);

  },

  create: function(req, res, next) {
    var userId = req.resourceUser.id;
    var roomId = req.userTroupe.id;
    var chatId = "" + req.body.chatId;

    return collapsedChatsService.update(userId, roomId, chatId, true)
      .then(function() {
        res.send('OK');
      })
      .fail(next);
  },

  destroy: function(req, res, next) {
    var userId = req.resourceUser.id;
    var roomId = req.userTroupe.id;
    var chatId = req.collapsedItem;

    return collapsedChatsService.update(userId, roomId, chatId, false)
      .then(function() {
        res.send('OK');
      })
      .fail(next);
  },

  load: function(req, id, callback) {
    return callback(null, id);
  }

};
