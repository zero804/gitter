"use strict";

var UserStrategy = require('gitter-web-user-serialization/lib/notifications/user-strategy')

function AggregatedReplyStrategy() {
  this.userStrategy = new UserStrategy();
}

AggregatedReplyStrategy.prototype = {
  map: function(item, authorUser) {
    return {
      id: item.id || item._id && item._id.toHexString(),
      body: {
        text: item.text,
        html: item.html,
      },

      user: this.userStrategy.map(authorUser),
      commentsTotal: item.commentsTotal,
      sent: item.sent,
      editedAt: item.editedAt,
      lastChanged: item.lastChanged,
      lastModified: item.lastModified,
    };
  },

  name: 'AggregatedReplyStrategy',
};

module.exports = AggregatedReplyStrategy;
