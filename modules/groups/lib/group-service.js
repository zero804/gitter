'use strict';

var Promise = require('bluebird');
var Group = require('gitter-web-persistence').Group;
var assert = require('assert');
var validateGroupName = require('gitter-web-validators/lib/validate-group-name');
var validateGroupUri = require('gitter-web-validators/lib/validate-group-uri');
var StatusError = require('statuserror');
var policyFactory = require('gitter-web-permissions/lib/legacy-policy-factory');
var validateUri = require('gitter-web-github').GitHubUriValidator;
var debug = require('debug')('gitter:groups:group-service');

function findById(groupId) {
  return Group.findById(groupId)
    .lean()
    .exec();
}

function createGroup(user, options) {
  var name = options.name;
  var uri = options.uri;
  assert(user, 'user required');
  assert(name, 'name required');
  assert(uri, 'name required');

  if(!validateGroupName(name)) {
    throw new StatusError(400, 'Invalid group name');
  }

  if(!validateGroupUri(uri)) {
    throw new StatusError(400, 'Invalid group uri');
  }

  /* From here on we're going to be doing a create */
  return validateUri(user, uri)
    .bind({
      githubInfo: null,
      policy: null
    })
    .then(function(githubInfo) {
      debug("GitHub information for %s is %j", uri, githubInfo);

      if (!githubInfo) throw new StatusError(404);
      var githubType = githubInfo.type;
      var officialUri = githubInfo.uri;
      if (githubType !== 'ORG') throw new StatusError(400, 'Can only create groups for ORGs right now');

      this.githubInfo = githubInfo;

      return policyFactory.createPolicyForGithubObject(user, officialUri, githubType, null);
    })
    .then(function(policy) {
      this.policy = policy;

      return policy.canAdmin();
    })
    .then(function(isAdmin) {
      if (!isAdmin) throw new StatusError(403, 'Not an administrator of this org');

      var githubInfo = this.githubInfo;
      var githubType = githubInfo.type;
      var officialUri = githubInfo.uri;
      var lcUri = officialUri.toLowerCase();
      var githubId = githubInfo.githubId || null;

      var group = new Group({
        name: name,
        uri: uri,
        lcUri: lcUri,
        type: githubType,
        githubId: githubId,
      });

      return group.save();
    });
}

module.exports = {
  findById: Promise.method(findById),
  createGroup: Promise.method(createGroup)
};
