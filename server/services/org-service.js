'use strict';

var BackendMuxer = require('gitter-web-backend-muxer');
var securityDescriptorFinder = require('gitter-web-permissions/lib/security-descriptor/finder');

function getOrgsForUser(user) {
  var backendMuxer = new BackendMuxer(user);
  return backendMuxer.findOrgs();
}

async function getUnusedOrgsForUser(user) {
  const orgs = await getOrgsForUser(user);

  this.orgs = orgs;

  var linkPaths = orgs.map(function(org) {
    return org.login;
  });
  const usedLinkPaths = await securityDescriptorFinder.getUsedLinkPaths('GH_ORG', linkPaths);

  return this.orgs.filter(function(org) {
    return !usedLinkPaths[org.login];
  });
}

module.exports = {
  getOrgsForUser: getOrgsForUser,
  getUnusedOrgsForUser: getUnusedOrgsForUser
};
