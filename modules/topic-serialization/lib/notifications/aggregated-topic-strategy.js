"use strict";

var UserStrategy = require('gitter-web-user-serialization/lib/notifications/user-strategy')

function AggregatedTopicStrategy() {
  this.userStrategy = new UserStrategy();
}

AggregatedTopicStrategy.prototype = {
  map: function(topic, authorUser, owningForum) {
    var id = topic.id || topic._id && topic._id.toHexString();

    return {
      id: id,
      title: topic.title,
      slug: topic.slug,
      body: {
        text: topic.text,
        html: topic.html,
      },
      sticky: topic.sticky,
      tags: topic.tags,
      // category: this.mapCategory(topic.categoryId), Deal with Category
      user: this.userStrategy.map(authorUser),
      repliesTotal: topic.repliesTotal,
      sent: topic.sent,
      editedAt: topic.editedAt,
      lastChanged: topic.lastChanged,
      lastModified: topic.lastModified,

      // TODO: permalink?
      uri: owningForum.uri + '/topic/' + id + '/' + topic.slug
    }
  },

  name: 'AggregatedTopicStrategy',
};

module.exports = AggregatedTopicStrategy;
