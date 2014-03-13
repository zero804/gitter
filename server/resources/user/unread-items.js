/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var unreadItemService = require("../../services/unread-item-service");

module.exports = {
  id: 'unreadItem',
  index: function(req, res, next) {
    var userId = req.resourceUser.id;

    unreadItemService.getUnreadItemsForUser(userId, req.userTroupe.id, function(err, data) {
      if(err) return next(err);

      res.send(data);
    });
  },

  create: function(req, res, next) {
    var unreadItems = req.body;
    if(!unreadItems) return next(400);

    if(!unreadItems.mention && !unreadItems.chat) return next(400); /* You comin at me bro? */

    return unreadItemService.markItemsRead(req.resourceUser.id, req.userTroupe.id, unreadItems.chat, unreadItems.mention)
      .then(function() {
        res.send(200);
      })
      .fail(next);

  },

  destroy: function(req, res, next) {
    if(req.params.unreadItem.toLowerCase() !== 'all') return next(404);

    return unreadItemService.markAllChatsRead(req.resourceUser.id, req.userTroupe.id, { member: true })
      .then(function() {
        res.send(200);
      })
      .fail(next);
  },


  load: function(req, id, callback) {
    return callback(id);
  }

};
