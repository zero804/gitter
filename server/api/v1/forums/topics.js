"use strict";

var Promise = require('bluebird');
var StatusError = require('statuserror');
var internalClientAccessOnly = require('../../../web/middlewares/internal-client-access-only');
var forumCategoryService = require('gitter-web-forum-categories/lib/forum-category-service');
var topicService = require('gitter-web-topics/lib/topic-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var ForumWithPolicyService = require('../../../services/forum-with-policy-service');
var restSerializer = require('../../../serializers/rest-serializer');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');


function getTopicOptions(body) {
  var title = body.title ? String(body.title) : undefined;
  var slug = body.slug ? String(body.slug) : undefined;

  var tags;
  if (body.tags && Array.isArray(body.tags)) {
    var tagsAreStrings = body.tags.every(function(s) {
      return typeof s === 'string';
    });

    if (tagsAreStrings) {
      tags = body.tags;
    }
  }

  var sticky = body.sticky ? !!body.sticky : undefined;
  var text = body.text ? String(body.text) : undefined;

  return {
    // required:
    title: title,
    text: text,

    // optional:
    slug: slug,
    tags: tags,
    sticky: sticky
  };
}

module.exports = {
  id: 'topic',

  index: function(req) {
    var forum = req.forum;

    // TODO: return a sample set, not all of them
    return topicService.findByForumId(forum._id)
      .then(function(topics) {
        var strategy = new restSerializer.TopicStrategy({
          // again: _some_ replies, not all of them
          includeReplies: true,
          includeRepliesTotals: true,
        });
        return restSerializer.serialize(topics, strategy);
      });
  },

  show: function(req) {
    var topic = req.topic;
    var strategy = new restSerializer.TopicStrategy({
      includeReplies: true,
      includeRepliesTotals: true,
    });
    return restSerializer.serializeObject(topic, strategy);
  },

  load: function(req, id) {
    if (!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

    return topicService.findByIdForForum(req.forum._id, id);
  },

  create: function(req) {
    var user = req.user;
    var forum = req.forum;
    var policy = req.userForumPolicy;

    // This is for internal clients only
    if (!internalClientAccessOnly.isRequestFromInternalClient(req)) {
      throw new StatusError(404);
    }

    if (!user) throw new StatusError(401);

    // the category gets loaded in separately
    var categoryId = req.body.categoryId ? String(req.body.categoryId) : undefined;
    if (!categoryId) throw new StatusError(400, 'categoryId required.');

    var topicOptions = getTopicOptions(req.body);

    return forumCategoryService.findByIdForForum(forum._id, categoryId)
      .then(function(category) {
        if (!category) throw new StatusError(404, 'Category not found.');

        var forumWithPolicyService = new ForumWithPolicyService(forum, user, policy);
        return forumWithPolicyService.createTopic(category, topicOptions);
      })
      .then(function(topic) {
        var topicStrategy = new restSerializer.TopicStrategy();
        return restSerializer.serializeObject(topic, topicStrategy);
      });
  },

  subresources: {
    'replies': require('./replies'),
  },

};
