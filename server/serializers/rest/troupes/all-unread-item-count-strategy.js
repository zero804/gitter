"use strict";

var unreadItemService = require('../../../services/unread-items');

function AllUnreadItemCountStrategy(options) {
  var self = this;
  var userId = options.userId || options.currentUserId;

  this.preload = function(troupeIds) {
    return unreadItemService.getUserUnreadCountsForTroupeIds(userId, troupeIds.toArray())
      .then(function(result) {
        self.unreadCounts = result;
      });
  };

  this.map = function(id) {
    return self.unreadCounts[id] ? self.unreadCounts[id] : 0;
  };
}

AllUnreadItemCountStrategy.prototype = {
  name: 'AllUnreadItemCountStrategy'
};

module.exports = AllUnreadItemCountStrategy;
