#!/usr/bin/env node

"use strict";

var Promise = require('bluebird');
var validateUri = require('gitter-web-github').GitHubUriValidator;
var userService = require('../../server/services/user-service');
var legacyPolicyFactory = require('gitter-web-permissions/lib/legacy-policy-factory');


function execute(username, uri) {
  return userService.findByUsername(username)
    .bind({
      user: null
    })
    .then(function(user) {
      this.user = user;
      if (!user) throw new Error('User not found');

      return validateUri(user, uri);
    })
    .then(function(githubInfo) {
      if (!githubInfo) throw new Error('Unable to find GitHub object: ' + uri);

      var githubType = githubInfo.type;
      var officialUri = githubInfo.uri;
      var security;
      if (githubType === 'ORG') {
        security = null;
      } else {
        security = githubInfo.security;
      }

      return legacyPolicyFactory.createPolicyForGithubObject(this.user, officialUri, githubType, security);
    })
    .then(function(policy) {
      return Promise.props({
        canRead: policy.canRead(),
        canWrite: policy.canWrite(),
        canAdmin: policy.canAdmin(),
        canJoin: policy.canJoin(),
        canAddUser: policy.canAddUser()
      });
    })
    .then(function(result) {
      console.log(result);
    });
}

var opts = require('yargs')
  .option('username', {
    alias: 'u',
    required: true,
    description: 'User to check permissions on behalf of'
  })
  .option('uri', {
    alias: 'g',
    required: true,
    description: 'GitHub object to check permissions of'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

execute(opts.username, opts.uri)
  .catch(function(e) {
    console.error(e.stack);
    process.exit(1);
  })
  .finally(function() {
    process.exit();
  });
