#!/usr/bin/env node
'use strict';

var Promise = require('bluebird');
var yargs = require('yargs');
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
    description: 'topic id of the topic you want to update'
  })
  .option('tags', {
    required: false,
    description: 'comma-separated list of tags'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

function setTags(forumWithPolicyService, topic, tags) {
  // turn it into an array of strings with extra whitespace trimmed
  tags = tags.split(',').map(function(s) {
    return s.trim();
  });
  return forumWithPolicyService.setTopicTags(topic, tags);
}

utils.runScript(function() {
  return utils.getForumWithPolicyService(opts.username, opts.group)
    .then(function(forumWithPolicyService) {
      this.forumWithPolicyService = forumWithPolicyService;
      return topicService.findByIdForForum(this.forum._id, opts.topic)
    })
    .then(function(topic) {
      if (!topic) throw new StatusError(404, 'Topic not found.');

      var forumWithPolicyService = this.forumWithPolicyService;

      var promises = [];

      if (opts.tags) {
        promises.push(setTags(forumWithPolicyService, topic, opts.tags));
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
