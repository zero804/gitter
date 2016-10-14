"use strict";

var UserStrategy = require('gitter-web-user-serialization/lib/notifications/user-strategy')

function AggregatedReplyStrategy() {
  this.userStrategy = new UserStrategy();
}

AggregatedReplyStrategy.prototype = {
  map: function(reply, authorUser, owningTopic, owningForum) {
    var owningTopicId = owningTopic.id || (owningTopic._id && owningTopic._id.toHexString());

    return {
      id: reply.id || reply._id && reply._id.toHexString(),

      body: {
        text: reply.text,
        html: reply.html,
      },

      user: this.userStrategy.map(authorUser),
      commentsTotal: reply.commentsTotal,
      sent: reply.sent,
      editedAt: reply.editedAt,
      lastChanged: reply.lastChanged,
      lastModified: reply.lastModified,

      // TODO: permalink?
      uri: owningForum.uri + '/topic/' + owningTopicId + '/' + reply.slug
    };
  },

  name: 'AggregatedReplyStrategy',
};

module.exports = AggregatedReplyStrategy;
