"use strict";

function AggregatedForumStrategy() {
}

AggregatedForumStrategy.prototype = {
  map: function(forum) {
    return {
      id: forum.id || forum._id && forum._id.toHexString(),
      name: forum.name,
      uri: forum.uri,
      tags: forum.tags
    };
  },

  name: 'AggregatedForumStrategy',
};

module.exports = AggregatedForumStrategy;
