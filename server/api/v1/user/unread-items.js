"use strict";

var unreadItemService = require("../../../services/unread-item-service");
var StatusError = require('statuserror');
var uniqueIds = require('mongodb-unique-ids');

module.exports = {
  id: 'unreadItem',
  index: function(req, res, next) {
    var userId = req.resourceUser.id;

    unreadItemService.getUnreadItemsForUser(userId, req.params.userTroupeId)
      .then(function(data) {
        res.send(data);
      })
      .catch(next);
  },

  create: function(req, res, next) {
    var unreadItems = req.body;
    if(!unreadItems) return next(new StatusError(400, 'No body'));

    var allIds = [];

    /* TODO: remove mentions in February 2015 */
    if(Array.isArray(unreadItems.mention)) allIds = allIds.concat(unreadItems.mention);
    if(Array.isArray(unreadItems.chat)) allIds = allIds.concat(unreadItems.chat);

    if(Array.isArray(unreadItems.mention) && Array.isArray(unreadItems.chat)) {
      allIds = uniqueIds(allIds);
    }

    if(!allIds.length) return next(new StatusError(400)); /* You comin at me bro? */

    return unreadItemService.markItemsRead(req.resourceUser.id, req.params.userTroupeId, allIds)
      .then(function() {
        res.format({
          text: function() {
            res.send('OK');
          },
          json: function() {
            res.send({ success: true });
          },
          html: function() {
            res.send('OK');
          }
        });
      })
      .catch(next);

  },

  destroy: function(req, res, next) {
    if(req.params.unreadItem.toLowerCase() !== 'all') return next(new StatusError(404));

    return unreadItemService.markAllChatsRead(req.resourceUser.id, req.params.userTroupeId, { member: true })
      .then(function() {
        res.format({
          text: function() {
            res.send('OK');
          },
          json: function() {
            res.send({ success: true });
          },
          html: function() {
            res.send('OK');
          }
        });
      })
      .catch(next);
  }

};
