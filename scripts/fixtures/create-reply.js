#!/usr/bin/env node
'use strict';

var yargs = require('yargs');
var faker = require('faker');
var StatusError = require('statuserror');
var utils = require('./fixture-script-utils');
var topicService = require('gitter-web-topics/lib/topic-service');


var opts = yargs
  .option('username', {
    required: true,
    description: 'username of the user that should perform the action'
  })
  .option('group', {
    required: true,
    description: 'group uri of the group containing the forum'
  })
  .option('topic', {
    required: true,
    description: 'topic id of the topic you want to reply to'
  })
  .option('text', {
    required: false,
    description: 'reply text (optional)'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

utils.runScript(function() {
  return utils.getForumWithPolicyService(opts.username, opts.group)
    .then(function(forumWithPolicyService) {
      this.forumWithPolicyService = forumWithPolicyService;
      return topicService.findByIdForForum(this.forum._id, opts.topic);
    })
    .then(function(topic) {
      if (!topic) throw new StatusError(404, 'Topic not found.');

      var forumWithPolicyService = this.forumWithPolicyService;
      return forumWithPolicyService.createReply(topic, {
        text: opts.text || faker.hacker.phrase(),
      })
    })
    .then(function(reply) {
      console.log("CREATED " + reply.id);
    });
});
