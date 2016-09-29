"use strict";

function AggregatedForumStrategy() {
}

AggregatedForumStrategy.prototype = {
  map: function(item) {
    return {
      id: item.id || item._id && item._id.toHexString(),
      name: item.name,
      uri: item.uri,
      tags: item.tags
    };
  },

  name: 'AggregatedForumStrategy',
};

module.exports = AggregatedForumStrategy;
