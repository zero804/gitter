#!/usr/bin/env node
'use strict';

var Promise = require('bluebird');
var yargs = require('yargs');
var faker = require('faker');
var StatusError = require('statuserror');
var utils = require('./fixture-script-utils');


var opts = yargs
  .option('username', {
    required: true,
    description: 'username of the user that should perform the action'
  })
  .option('group', {
    required: true,
    description: 'group uri of the group containing the forum'
  })
  .option('tags', {
    required: false,
    description: 'comma-separated list of tags'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

function setTags(forumWithPolicyService, tags) {
  // turn it into an array of strings with extra whitespace trimmed
  tags = tags.split(',').map(function(s) {
    return s.trim();
  });
  return forumWithPolicyService.setForumTags(tags);
}

utils.runScript(function() {
  return utils.getForumWithPolicyService(opts.username, opts.group)
    .then(function(forumWithPolicyService) {
      var promises = [];

      if (opts.tags) {
        promises.push(setTags(forumWithPolicyService, opts.tags));
      }

      if (!promises.length) {
        throw new StatusError(400, 'Nothing to update.');
      }

      return Promise.all(promises);
    })
    .then(function(responses) {
      console.log(responses);
    });
});
