'use strict';

var BackendMuxer = require('gitter-web-backend-muxer');
var securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor-service');


function getOrgsForUser(user) {
  var backendMuxer = new BackendMuxer(user);
  return backendMuxer.findOrgs()
}

function getUnusedOrgsForUser(user) {
  return getOrgsForUser(user)
    .bind({
      orgs: null
    })
    .then(function(orgs) {
      this.orgs = orgs;

      var linkPaths = orgs.map(function(org) {
        return org.login;
      });
      return securityDescriptorService.getUsedLinkPaths('GH_ORG', linkPaths);
    })
    .then(function(usedLinkPaths) {
      return this.orgs.filter(function(org) {
        return !usedLinkPaths[org.login];
      });
    });
}

module.exports = {
  getOrgsForUser: getOrgsForUser,
  getUnusedOrgsForUser: getUnusedOrgsForUser
};
