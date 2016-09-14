#!/usr/bin/env node

'use strict';

var yargs = require('yargs');
var githubIssueSource = require('./github-issue-source');
var githubIssueCommentSource = require('./github-issue-comment-source');
var Promise = require('bluebird');
var categoryService = require('gitter-web-topics/lib/forum-category-service');
var StatusError = require('statuserror');
var userService = require('../../server/services/user-service');
var groupService = require('gitter-web-groups/lib/group-service');
var forumService = require('gitter-web-topics/lib/forum-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var ForumWithPolicyService = require('../../server/services/forum-with-policy-service');
var cheerio = require('cheerio')

var opts = yargs
  .option('repoUri', {
    required: true,
    description: 'repo to import issues from'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

function Importer() {
}

function processMarkdown(markdown) {
  var $ = cheerio.load(markdown)
  $('img').each(function(i, el) {
    var e = $(el);
    var src = e.attr('src') || '';
    var alt = e.attr('alt') || '';
    $(el).replaceWith('![' + alt + '](' + src + ')')
  });

  return $.html().trim();
}

Importer.prototype = {
  getForumWithPolicyService: function(username, groupUri) {
    return Promise.join(
        userService.findByUsername(username)
          .then(function(user) {
            if (user) return user;
            return userService.findByUsername('suprememoocow');
          }),
        groupService.findByUri(groupUri))
      .bind({})
      .spread(function(user, group) {
        if (!user) throw new StatusError(404, 'User not found.');
        if (!group) throw new StatusError(404, 'Group not found.');

        if (!group.forumId) throw new StatusError(404, "The group doesn't have a forum yet");

        this.user = user;
        this.group = group;

        return forumService.findById(group.forumId);

      })
      .then(function(forum) {
        if (!forum) throw new StatusError(404, 'Forum not found.');

        this.forum = forum;

        return policyFactory.createPolicyForForum(this.user, forum);
      })
      .then(function(policy) {
        return new ForumWithPolicyService(this.forum, this.user, policy);
      });
  },

  createIssue: function(issue) {
    // Create a topic for each issue...
    var username = issue.user.login;
    return this.getForumWithPolicyService(username, 'gitterHQ')
      .then(function(forumWithPolicyService) {
        this.forumWithPolicyService = forumWithPolicyService;
        return categoryService.findBySlugForForum(this.forum._id, 'issues');
      })
      .then(function(category) {
        return this.forumWithPolicyService.createTopic(category, {
          title: issue.title.trim(),
          text: issue.body ? processMarkdown(issue.body) : "No body"
        });
      })
  },

  createReply: function(topic, comment) {
    var username = comment.user.login;

    return this.getForumWithPolicyService(username, 'gitterHQ')
      .then(function(forumWithPolicyService) {
        return forumWithPolicyService.createReply(topic, {
          text: processMarkdown(comment.body)
        });
      })
  }
}

function doImport(opts) {
  return new Promise(function(resolve, reject) {
    var source = githubIssueSource({ repoUri: opts.repoUri, state: 'all', labels: 'workstream:topics' });
    var importer = new Importer();

    source
      .flatMap(function(issue) {
        // Create a topic for each issue
        return importer.createIssue(issue)
          .then(function(topic) {
            return {
              forumWithPolicy: this.forumWithPolicyService,
              forum: this.forum,
              issue: issue,
              topic: topic,
            }
          });
      })
      .flatMap(function(item) {
        // FlatMap the issue comments onto the issue
        var issueNumber = item.issue.number;
        return githubIssueCommentSource({ repoUri: opts.repoUri, issueNumber: issueNumber });
      }, function(item, comment) {
        return {
          topic: item.topic,
          comment: comment
        }
      })
      .flatMap(function(item) {
        // Create a reply for each issue comment
        var comment = item.comment;
        var topic = item.topic;

        return importer.createReply(topic, comment);
      })
      .subscribe(
      function() { },
      reject,
      resolve);
  });
}

doImport(opts)
  .then(function() {
    process.exit()
  })
  .catch(function(err) {
    console.log(err.stack);
    process.exit(1);
  })
