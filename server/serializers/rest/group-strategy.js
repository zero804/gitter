"use strict";

var avatars = require('gitter-web-avatars');
var SecurityDescriptorStrategy = require('./security-descriptor-strategy');

function GroupStrategy(options) {
  this.options = options || {};
}

GroupStrategy.prototype = {
  name: 'GroupStrategy',

  preload: function() {
    this.securityDescriptorStrategy = SecurityDescriptorStrategy.simple();
    return;
  },

  map: function(group) {
    var options = this.options;
    var id = group.id || group._id && group._id.toHexString();

    var hasAvatarSet = undefined;
    if(options.includeHasAvatarSet) {
      hasAvatarSet = group.avatarVersion > 0 || group.sd.type === 'GH_ORG' || group.sd.type === 'GH_REPO' || group.sd.type === 'GH_USER';
    }

    return {
      id: id,
      name: group.name,
      uri: group.uri,
      backedBy: this.securityDescriptorStrategy.map(group.sd),
      avatarUrl: avatars.getForGroup(group),
      hasAvatarSet: hasAvatarSet,
      forumId: group.forumId
    };

  }
};

module.exports = GroupStrategy;
