"use strict";

var UserStrategy = require('gitter-web-user-serialization/lib/notifications/user-strategy')

function AggregatedReplyStrategy() {
  this.userStrategy = new UserStrategy();
}

AggregatedReplyStrategy.prototype = {
  map: function(item, authorUser, owningTopic, owningForum) {
    var owningTopicId = owningTopic.id || (owningTopic._id && owningTopic._id.toHexString());

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

      // TODO: permalink?
      uri: owningForum.uri + '/topic/' + owningTopicId + '/' + item.slug
    };
  },

  name: 'AggregatedReplyStrategy',
};

module.exports = AggregatedReplyStrategy;
