"use strict";

function GroupStrategy(/*options*/) {
}

GroupStrategy.prototype = {
  name: 'GroupStrategy',

  preload: function(/*groups*/) {
    return;
  },

  map: function(group) {
    return {
      id: group.id || group._id && group._id.toHexString(),
      name: group.name,
      uri: group.uri
    };
  }
};

module.exports = GroupStrategy;
