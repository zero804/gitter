"use strict";

var resolveGroupIdAvatarUrl = require('gitter-web-shared/avatars/resolve-group-id-avatar-url');

function GroupStrategy(options) {
  var lean = options && options.lean;

  this.preload = function(/*groups*/) {
    return;
  };

  this.map = function(group) {
    var id = group.id || group._id && group._id.toHexString();
    return {
      id: id,
      name: group.name,
      uri: group.uri,
      avatarUrl: lean ? undefined : resolveGroupIdAvatarUrl(group._id)
    };
  };
}

GroupStrategy.prototype = {
  name: 'GroupStrategy',
};

module.exports = GroupStrategy;
