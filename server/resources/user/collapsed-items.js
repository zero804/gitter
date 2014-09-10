/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var collapsedChatsService = require('../../services/collapsed-chats-service');
// var StatusError = require('statuserror');

module.exports = {
  id: 'collapsedItem',
  index: function(req, res, next) {
    var userId = req.resourceUser.id;
    var roomId = req.userTroupe.id;

    return collapsedChatsService.getHash(userId, roomId)
      .then(function (hash) {
        res.send(Object.keys(hash));
      })
      .catch(next);
  },

  create: function(req, res, next) {
    var userId = req.resourceUser.id;
    var roomId = req.userTroupe.id;
    var chatId = "" + req.body.chatId; // TODO: make sure this is not undefined

    return collapsedChatsService.update(userId, roomId, chatId, true)
      .then(function () {
        res.send('OK');
      })
      .catch(next);
  },

  destroy: function(req, res, next) {
    var userId = req.resourceUser.id;
    var roomId = req.userTroupe.id;
    var chatId = req.collapsedItem;

    return collapsedChatsService.update(userId, roomId, chatId, false)
      .then(function () {
        res.send('OK');
      })
      .catch(next);
  },

  load: function(req, id, callback) {
    return callback(null, id);
  }

};
