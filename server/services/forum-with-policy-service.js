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
var subscriberService = require('gitter-web-topic-notifications/lib/subscriber-service');
var reactionService = require('gitter-web-topic-reactions/lib/reaction-service');

function allowAdmin() {
  return this.policy.canAdmin();
}

function allowRead() {
  return this.policy.canRead();
}

function allowWrite() {
  return this.policy.canWrite();
}

function allowOwner(object) {
  // Users can edit/delete topics, replies or comments they created
  return mongoUtils.objectIDsEqual(object.userId, this.user._id);
}

function allowAnyone() {
  return true;
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
    return function() {
      throw new StatusError(404, 'forumId does not match');
    }
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

/**
 * Adding things
 */
ForumWithPolicyService.prototype.createCategory = secureMethod([allowAdmin], function(options) {
  var user = this.user;
  var forum = this.forum;

  var categoryOptions = getCategoryOptions(options);
  return forumCategoryService.createCategory(user, forum, categoryOptions);
});

ForumWithPolicyService.prototype.createTopic = secureMethod([matchForum, allowWrite], function(category, options) {
  var user = this.user;
  var forum = this.forum;

  var createOptions = getTopicOptions(options);

  // only tags already on the forum are allowed to be used in the topic
  createOptions.allowedTags = forum.tags;

  return topicService.createTopic(user, category, createOptions);
});

ForumWithPolicyService.prototype.createReply = secureMethod([matchForum, allowWrite], function(topic, options) {
  var user = this.user;

  var createOptions = getReplyOptions(options);
  return replyService.createReply(user, topic, createOptions);
});

ForumWithPolicyService.prototype.createComment = secureMethod([matchForum, allowWrite], function(reply, options) {
  var user = this.user;

  var createOptions = getCommentOptions(options);
  return commentService.createComment(user, reply, createOptions);
});

/**
 * Forum update
 */
ForumWithPolicyService.prototype.setForumTags = secureMethod([allowAdmin], function(tags) {
  var user = this.user;
  var forum = this.forum;

  return forumService.setForumTags(user, forum, tags);
});

/**
 * Topic update
 */
ForumWithPolicyService.prototype.updateTopic = secureMethod([matchForum, allowOwner, allowAdmin], function(topic, fields) {
  var user = this.user;

  return topicService.updateTopic(user, topic, fields);
});

ForumWithPolicyService.prototype.setTopicTags = secureMethod([matchForum, allowOwner, allowAdmin], function(topic, tags) {
  var user = this.user;
  var forum = this.forum;

  return topicService.setTopicTags(user, topic, tags, { allowedTags: forum.tags });
});

ForumWithPolicyService.prototype.setTopicSticky = secureMethod([matchForum, allowAdmin], function(topic, sticky) {
  var user = this.user;

  return topicService.setTopicSticky(user, topic, sticky);
});

ForumWithPolicyService.prototype.setTopicCategory = secureMethod([matchForum, allowOwner, allowAdmin], function(topic, category) {
  var user = this.user;
  var forum = this.forum;

  if (!mongoUtils.objectIDsEqual(category.forumId, forum._id)) {
    throw new StatusError(403, 'forumId does not match');
  }

  return topicService.setTopicCategory(user, topic, category);
});

/**
 * Reply update
 */
ForumWithPolicyService.prototype.updateReply = secureMethod([matchForum, allowOwner, allowAdmin], function(reply, fields) {
  var user = this.user;

  return replyService.updateReply(user, reply, fields);
});

/**
 * Comment update
 */
ForumWithPolicyService.prototype.updateComment = secureMethod([matchForum, allowOwner, allowAdmin], function(comment, fields) {
  var user = this.user;

  return commentService.updateComment(user, comment, fields);
});

/**
 * Category update
 */
ForumWithPolicyService.prototype.updateCategory = secureMethod([matchForum, allowAdmin], function(category, fields) {
  var user = this.user;

  return forumCategoryService.updateCategory(user, category, fields)
});

/**
 * Deleting things
 */
ForumWithPolicyService.prototype.deleteTopic = secureMethod([matchForum, allowOwner, allowAdmin], function(topic) {
  return topicService.deleteTopic(this.user, topic);
});

ForumWithPolicyService.prototype.deleteReply = secureMethod([matchForum, allowOwner, allowAdmin], function(reply) {
  return replyService.deleteReply(this.user, reply);
});

ForumWithPolicyService.prototype.deleteComment = secureMethod([matchForum, allowOwner, allowAdmin], function(comment) {
  return commentService.deleteComment(this.user, comment);
});

/**
 * Subscription bits
 */
ForumWithPolicyService.prototype.listSubscribers = secureMethod([matchForum, allowAdmin], function(forumObject) {
   return subscriberService.listForItem(forumObject);
});

ForumWithPolicyService.prototype.subscribe = secureMethod([matchForum, allowRead], function(forumObject) {
   return subscriberService.addSubscriber(forumObject, this.user._id);
});

ForumWithPolicyService.prototype.unsubscribe = secureMethod([matchForum, allowAnyone], function(forumObject) {
   return subscriberService.removeSubscriber(forumObject, this.user._id);
});

/**
 * Reactions
 */
ForumWithPolicyService.prototype.listReactions = secureMethod([matchForum, allowRead], function(forumObject) {
  return reactionService.listReactions(forumObject, this.user._id);
});

ForumWithPolicyService.prototype.addReaction = secureMethod([matchForum, allowRead], function(forumObject, reaction) {
  return reactionService.addReaction(forumObject, this.user._id, reaction);
});

ForumWithPolicyService.prototype.removeReaction = secureMethod([matchForum, allowAnyone], function(forumObject, reaction) {
  return reactionService.removeReaction(forumObject, this.user._id, reaction);
});

module.exports = ForumWithPolicyService;
