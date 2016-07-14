"use strict";

var Group = require('gitter-web-persistence').Group;

module.exports = function(groupId, size) {
  return Group.findById(groupId, { 'sd.type': 1, 'sd.linkPath': 1 }, { lean: true })
    .then(function(group) {
      if (!group) return null;

      var type = group.sd && group.sd.type;
      var linkPath = group.sd && group.sd.linkPath;

      if (!linkPath) return null;

      var githubUsername;

      switch(type) {
        case 'GH_ORG':
        case 'GH_USER':
          githubUsername = linkPath;
          break;

        case 'GH_REPO':
          githubUsername = linkPath.split('/')[0];
      }

      if (!githubUsername) return null;

      return 'https://avatars.githubusercontent.com/' + githubUsername + '?s=' + size;
    });
}
