'use strict';

var Promise = require('bluebird');
var collaboratorsCore = require('gitter-web-github-backend/lib/github-collaborators-service');


function deduplicate(collaborators) {
  var deduped = [];
  var logins = {};
  collaborators.forEach(function(collaborator) {
    if (!collaborator) return;
    if (logins[collaborator.login]) return;
    logins[collaborator.login] = 1;
    deduped.push(collaborator);
  });
  return deduped;
}

module.exports = function getCollaboratorForRoom(room, user) {
  var roomType = room.githubType.split('_')[0];
  var security = room.security;
  var _uri = room.uri.split('/');

  switch(roomType) {
    case 'REPO': // REPOs and REPO_CHANNELs
      var repoUri = _uri[0] + '/' + _uri[1];
      return collaboratorsCore.getCollaboratorsForRepo(repoUri, security, user)
        .then(deduplicate);

    case 'ORG': // ORGs and ORG_CHANNELs
      var orgUri = _uri[0];
      return collaboratorsCore.getCollaboratorsForOrg(orgUri, user)
        .then(deduplicate);

    case 'USER': // USER_CHANNELs
      return collaboratorsCore.getCollaboratorsForUser(user)
        .then(deduplicate);

    default:
      return Promise.resolve([]);
  }


};
