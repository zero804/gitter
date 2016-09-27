"use strict";

var UserStrategy = require('gitter-web-user-serialization/lib/notifications/user-strategy')

function AggregatedCommentStrategy() {
  this.userStrategy = new UserStrategy();
}

AggregatedCommentStrategy.prototype = {
  map: function(item, authorUser, owningComment, owningTopic, owningForum) {
    var owningTopicId = owningTopic.id || (owningTopic._id && owningTopic._id.toHexString());

    return {
      id: item.id || item._id && item._id.toHexString(),
      body: {
        text: item.text,
        html: item.html
      },
      user: this.userStrategy.map(authorUser),
      sent: item.sent,
      editedAt: item.editedAt,

      // TODO: permalink?
      uri: owningForum.uri + '/topic/' + owningTopicId + '/' + item.slug
    };
  },

  name: 'AggregatedCommentStrategy',
};

module.exports = AggregatedCommentStrategy;
