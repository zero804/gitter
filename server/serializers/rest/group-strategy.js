"use strict";

var avatars = require('gitter-web-avatars');

function GroupStrategy(/* options */) {
  this.preload = function(/*groups*/) {
    return;
  };

  this.map = function(group) {
    var id = group.id || group._id && group._id.toHexString();
    return {
      id: id,
      name: group.name,
      uri: group.uri,
      backedBy: {
        type: group.sd.type,
        linkPath: group.sd.linkPath
      },
      avatarUrl: avatars.getForGroupId(group._id)
    };
  };
}

GroupStrategy.prototype = {
  name: 'GroupStrategy',
};

module.exports = GroupStrategy;
