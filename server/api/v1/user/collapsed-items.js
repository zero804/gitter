"use strict";

var collapsedChatsService = require('../../../services/collapsed-chats-service');

module.exports = {
  id: 'collapsedItem',
  index: function(req, res, next) {
    var userId = req.resourceUser.id;
    var roomId = req.params.userTroupeId;

    return collapsedChatsService.getHash(userId, roomId)
      .then(function (hash) {
        res.send(Object.keys(hash));
      })
      .catch(next);
  },

  create: function(req, res, next) {
    var userId = req.resourceUser.id;
    var roomId = req.params.userTroupeId;
    var chatId = "" + req.body.chatId; // TODO: make sure this is not undefined

    return collapsedChatsService.update(userId, roomId, chatId, true)
      .then(function () {
        res.send('OK');
      })
      .catch(next);
  },

  destroy: function(req, res, next) {
    var userId = req.resourceUser.id;
    var roomId = req.params.userTroupeId;
    var chatId = req.params.collapsedItem;

    return collapsedChatsService.update(userId, roomId, chatId, false)
      .then(function () {
        res.send('OK');
      })
      .catch(next);
  }

};
