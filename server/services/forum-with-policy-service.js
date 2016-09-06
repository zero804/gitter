'use strict';

var assert = require('assert');
var slugify = require('gitter-web-slugify');
var StatusError = require('statuserror');
var forumService = require('gitter-web-topics/lib/forum-service');
var forumCategoryService = require('gitter-web-topics/lib/forum-category-service');
var topicService = require('gitter-web-topics/lib/topic-service');
var replyService = require('gitter-web-topics/lib/reply-service');
var commentService = require('gitter-web-topics/lib/comment-service');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var secureMethod = require('../utils/secure-method');


function allowAdmin() {
  return this.policy.canAdmin();
}

function allowWrite() {
  return this.policy.canWrite();
}

function matchForum(object) {
  /*
  Suppose a user posts to /v1/forums/:forumId/topics/:topicId/replies. This
  makes sure that that topic is actually in the same forum. Otherwise you can
  craft a URL that will do the security validation against one forum, but allow
  you to then perform actions against any category/topic/reply/comment/whatever
  in any other forum. (Depending obviously on what the code did before we got
  here.) That wouldn't be good.

  object is the first param which can be category, topic, reply or comment, all
  of which have forumId properties that have to match this forum's id.
  */
  if (!mongoUtils.objectIDsEqual(object.forumId, this.forum._id)) {
    // not sure what would be the best HTTP status code here
    throw new StatusError(403, 'forumId does not match');
  }
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
    // TODO: should the default slugify be performed in here, or in the
    // integration service or in the module service?
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

  return opts;
}

function getCommentOptions(options) {
  var opts = {
    text: options.text
  };

  return opts;
}

ForumWithPolicyService.prototype.createCategory = secureMethod([allowAdmin], function(options) {
  var user = this.user;
  var forum = this.forum;

  var categoryOptions = getCategoryOptions(options);
  return forumCategoryService.createCategory(user, forum, categoryOptions);
});

ForumWithPolicyService.prototype.createTopic = secureMethod([allowWrite, matchForum], function(category, options) {
  var user = this.user;
  var forum = this.forum;

  var createOptions = getTopicOptions(options);

  // only tags already on the forum are allowed to be used in the topic
  createOptions.allowedTags = forum.tags;

  return topicService.createTopic(user, category, createOptions);
});

ForumWithPolicyService.prototype.createReply = secureMethod([allowWrite, matchForum], function(topic, options) {
  var user = this.user;

  var createOptions = getReplyOptions(options);
  return replyService.createReply(user, topic, createOptions);
});

ForumWithPolicyService.prototype.createComment = secureMethod([allowWrite, matchForum], function(reply, options) {
  var user = this.user;

  var createOptions = getCommentOptions(options);
  return commentService.createComment(user, reply, createOptions);
});

ForumWithPolicyService.prototype.setForumTags = secureMethod([allowAdmin], function(tags) {
  var user = this.user;
  var forum = this.forum;

  return forumService.setForumTags(user, forum, tags);
});

ForumWithPolicyService.prototype.setTopicTags = secureMethod([allowAdmin, matchForum], function(topic, tags) {
  var user = this.user;
  var forum = this.forum;

  return topicService.setTopicTags(user, topic, tags, { allowedTags: forum.tags });
});

module.exports = ForumWithPolicyService;
