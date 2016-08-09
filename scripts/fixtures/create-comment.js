#!/usr/bin/env node
'use strict';

var yargs = require('yargs');
var faker = require('faker');
var StatusError = require('statuserror');
var utils = require('./fixture-script-utils');
var replyService = require('gitter-web-replies/lib/reply-service');


var argv = yargs.argv;
var opts = yargs
  .option('username', {
    required: true,
    description: 'username of the user that should perform the action'
  })
  .option('group', {
    required: true,
    description: 'group uri of the group containing the forum'
  })
  .option('reply', {
    required: true,
    description: 'reply id of the reply you want to comment on'
  })
  .option('text', {
    required: false,
    description: 'comment text (optional)'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

utils.runScript(function() {
  return utils.getForumWithPolicyService(opts.username, opts.group)
    .then(function(forumWithPolicyService) {
      this.forumWithPolicyService = forumWithPolicyService;
      return replyService.findByIdForForum(this.forum._id, opts.reply);
    })
    .then(function(reply) {
      if (!reply) throw new StatusError(404, 'Reply not found.');

      var forumWithPolicyService = this.forumWithPolicyService;
      return forumWithPolicyService.createComment(reply, {
        text: opts.text || faker.hacker.phrase(),
      })
    })
    .then(function(comment) {
      console.log("CREATED " + comment.id);
    });
});
