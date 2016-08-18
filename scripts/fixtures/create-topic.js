#!/usr/bin/env node
'use strict';

var yargs = require('yargs');
var faker = require('faker');
var StatusError = require('statuserror');
var utils = require('./fixture-script-utils');
var categoryService = require('gitter-web-topics/lib/forum-category-service');


var opts = yargs
  .option('username', {
    required: true,
    description: 'username of the user that should perform the action'
  })
  .option('group', {
    required: true,
    description: 'group uri of the group containing the forum'
  })
  .option('category', {
    required: true,
    description: 'category slug of the category you want to post to'
  })
  .option('title', {
    required: false,
    description: 'topic title (optional)'
  })
  .option('text', {
    required: false,
    description: 'topic text (optional)'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

utils.runScript(function() {
  return utils.getForumWithPolicyService(opts.username, opts.group)
    .then(function(forumWithPolicyService) {
      this.forumWithPolicyService = forumWithPolicyService;
      return categoryService.findBySlugForForum(this.forum._id, opts.category);
    })
    .then(function(category) {
      if (!category) throw new StatusError(404, 'Category not found.');

      var forumWithPolicyService = this.forumWithPolicyService;
      return forumWithPolicyService.createTopic(category, {
        title: opts.title || faker.commerce.productName(),
        text: opts.text || faker.hacker.phrase(),
        // TODO: slug
        // TODO: tags
        // TODO: sticky
      })
    })
    .then(function(topic) {
      console.log("CREATED " + topic.id);
    });
});
