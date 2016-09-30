"use strict";

var UserStrategy = require('gitter-web-user-serialization/lib/notifications/user-strategy')

function AggregatedTopicStrategy() {
  this.userStrategy = new UserStrategy();
}

AggregatedTopicStrategy.prototype = {
  map: function(item, authorUser, owningForum) {
    var id = item.id || item._id && item._id.toHexString();

    return {
      id: id,
      title: item.title,
      slug: item.slug,
      body: {
        text: item.text,
        html: item.html,
      },
      sticky: item.sticky,
      tags: item.tags,
      // category: this.mapCategory(topic.categoryId), Deal with Category
      user: this.userStrategy.map(authorUser),
      repliesTotal: item.repliesTotal,
      sent: item.sent,
      editedAt: item.editedAt,
      lastChanged: item.lastChanged,
      lastModified: item.lastModified,

      // TODO: permalink?
      uri: owningForum.uri + '/topic/' + id + '/' + item.slug
    }
  },

  name: 'AggregatedTopicStrategy',
};

module.exports = AggregatedTopicStrategy;
