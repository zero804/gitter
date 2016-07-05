'use strict';

var avatars = require('gitter-web-avatars');

function getAvatarUrlForUriContext(serializedTroupe) {
  if (serializedTroupe.oneToOne) {
    if (serializedTroupe.user) {
      return avatars.getForUser(serializedTroupe.user);
    } else {
      // TODO: investigate if and why this is happening...
      // It's borrowed from other code so just keeping it the same
      // for now
      return avatars.getForRoomUri(serializedTroupe.name);
    }
  } else {
    return avatars.getForRoomUri(serializedTroupe.uri);
  }
}

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

  return {
    url: serializedTroupe.url,
    oneToOne: serializedTroupe.oneToOne,
    troupeName: serializedTroupe.name,
    premium: serializedTroupe.premium,
    private: !!serializedTroupe.public,
    troupeTopic: serializedTroupe.topic,
    isAdmin: isTroupeAdmin(serializedTroupe),
    // TODO: move all the headerView things in here
    avatarUrl: getAvatarUrlForUriContext(serializedTroupe),
    group: group,
    groupPageUrl: groupPageUrl,
    githubLink: getGithubLinkUrl(serializedTroupe)
  };
}

module.exports = getHeaderViewOptions;
