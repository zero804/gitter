'use strict';

var assert = require('assert');
var slugify = require('gitter-web-slugify');
var StatusError = require('statuserror');
var forumCategoryService = require('gitter-web-forum-categories/lib/forum-category-service');
var topicService = require('gitter-web-topics/lib/topic-service');
var replyService = require('gitter-web-replies/lib/reply-service');
var commentService = require('gitter-web-comments/lib/comment-service');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var debug = require('debug')('gitter:app:forum-with-policy-service');
var secureMethod = require('../utils/secure-method');


function allowAdmin() {
  return this.policy.canAdmin();
}

function allowWrite() {
  return this.policy.canWrite();
}

function ForumWithPolicyService(forum, user, policy) {
  assert(forum, 'Forum required');
  assert(policy, 'Policy required');
  this.forum = forum;
  this.user = user;
  this.policy = policy;
}

function getCategoryOptions(options) {
  options = options || {};

  var name = options.name;

  var opts = {
    name: name,
    slug: options.slug || slugify(name)
  };

  return opts;
}

function getTopicOptions(options) {
  var title = options.title;
  var opts = {
    title: title,
    slug: options.slug || slugify(title),
    tags: options.tags,
    sticky: options.sticky,
    text: options.text
  };

  return opts;
}

function getReplyOptions(options) {
  var opts = {
    text: options.text
  };

  // TODO: validate text

  return opts;
}

function getCommentOptions(options) {
  var opts = {
    text: options.text
  };

  // TODO: validate text

  return opts;
}

ForumWithPolicyService.prototype.assertForumId = function(forumId) {
  if (!mongoUtils.objectIDsEqual(forumId, this.forum._id)) {
    // not sure what would be the best HTTP status code here
    throw new StatusError(403, 'forumId does not match');
  }
};

ForumWithPolicyService.prototype.createCategory = secureMethod([allowAdmin], function(options) {
  var user = this.user;
  var forum = this.forum;

  var categoryOptions = getCategoryOptions(options);
  return forumCategoryService.createCategory(user, forum, categoryOptions);
});

ForumWithPolicyService.prototype.createTopic = secureMethod([allowWrite], function(category, options) {
  this.assertForumId(category.forumId);

  var user = this.user;
  var forum = this.forum;

  var createOptions = getTopicOptions(options);
  return topicService.createTopic(user, category, createOptions);
});

ForumWithPolicyService.prototype.createReply = secureMethod([allowWrite], function(topic, options) {
  this.assertForumId(topic.forumId);

  var user = this.user;

  var createOptions = getReplyOptions(options);
  return replyService.createReply(user, topic, createOptions);
});

ForumWithPolicyService.prototype.createComment = secureMethod([allowWrite], function(reply, options) {
  this.assertForumId(reply.forumId);

  var user = this.user;

  var createOptions = getCommentOptions(options);
  return commentService.createComment(user, reply, createOptions);
});


module.exports = ForumWithPolicyService;
