#!/usr/bin/env node
'use strict';

var yargs = require('yargs');
var utils = require('./fixture-script-utils');

var argv = yargs.argv;
var opts = yargs
  .option('username', {
    required: true,
    description: 'username of the user that should perform the action'
  })
  .option('group', {
    required: true,
    description: 'group uri of the group that you want to add a forum to'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

utils.runScript(function() {
  return utils.getGroupWithPolicyService(opts.username, opts.group)
    .then(function(groupWithPolicyService) {
      return groupWithPolicyService.createForum()
    })
    .then(function(forum) {
      console.log("CREATED " + forum.id);
    });
});
