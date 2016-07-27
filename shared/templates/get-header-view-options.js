'use strict';

var avatars = require('gitter-web-avatars');

function getGithubLinkUrl(serializedTroupe) {
  var backend = serializedTroupe.backend;
  if (!backend) return;
  switch(backend.type) {
    case 'GH_REPO':
    case 'GH_ORG':
      return 'https://github.com/' + backend.linkPath;
  }

  return
}

function isTroupeAdmin(serializedTroupe) {
  return serializedTroupe.permissions && serializedTroupe.permissions.admin;
}

function getHeaderViewOptions(serializedTroupe) {
  var group = serializedTroupe.group;
  var groupUri = group && group.uri;
  var groupPageUrl = groupUri && '/orgs/' + groupUri + '/rooms';

  var avatarUrl = avatars.getForGroupId(serializedTroupe.groupId);
  if(group) {
    avatarUrl = group.avatarUrl;
  }
  else if(serializedTroupe.oneToOne) {
    avatarUrl = avatars.getForUser(serializedTroupe.user);
  }

  return {
    url: serializedTroupe.url,
    oneToOne: serializedTroupe.oneToOne,
    troupeName: serializedTroupe.name,
    premium: serializedTroupe.premium,
    isPrivate: !serializedTroupe.public,
    troupeTopic: serializedTroupe.topic,
    isAdmin: isTroupeAdmin(serializedTroupe),
    // TODO: move all the headerView things in here
    avatarUrl: avatarUrl,
    group: group,
    groupPageUrl: groupPageUrl,
    githubLink: getGithubLinkUrl(serializedTroupe)
  };
}

module.exports = getHeaderViewOptions;
