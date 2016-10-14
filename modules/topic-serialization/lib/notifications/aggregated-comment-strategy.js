"use strict";

var UserStrategy = require('gitter-web-user-serialization/lib/notifications/user-strategy')

function AggregatedCommentStrategy() {
  this.userStrategy = new UserStrategy();
}

AggregatedCommentStrategy.prototype = {
  map: function(reply, authorUser, owningComment, owningTopic, owningForum) {
    var owningTopicId = owningTopic.id || (owningTopic._id && owningTopic._id.toHexString());

    return {
      id: reply.id || reply._id && reply._id.toHexString(),
      body: {
        text: reply.text,
        html: reply.html
      },
      user: this.userStrategy.map(authorUser),
      sent: reply.sent,
      editedAt: reply.editedAt,

      // TODO: permalink?
      uri: owningForum.uri + '/topic/' + owningTopicId + '/' + reply.slug
    };
  },

  name: 'AggregatedCommentStrategy',
};

module.exports = AggregatedCommentStrategy;
