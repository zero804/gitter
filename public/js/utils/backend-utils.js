'use strict';

function getGitHubPath(object) {
  var backend = object.get && object.get('backend') || object.backend;
  if (!backend || !backend.linkPath) return;
  if (backend.type !== 'GH_REPO' && backend.type !== 'GH_ORG') return;
  return 'https://github.com/' + backend.linkPath;
}

function getLinkPathCond(type, object) {
  var backend = object.get && object.get('backend') || object.backend;
  if (!backend) return;
  if (backend.type === type) return backend.linkPath;
}

module.exports = {
  getGitHubPath: getGitHubPath,
  getLinkPathCond: getLinkPathCond
}
