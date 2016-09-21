"use strict";

var Promise = require('bluebird');
var StatusError = require('statuserror');
var internalClientAccessOnly = require('../../../web/middlewares/internal-client-access-only');
var forumCategoryService = require('gitter-web-topics/lib/forum-category-service');
var topicService = require('gitter-web-topics/lib/topic-service');
var ForumWithPolicyService = require('../../../services/forum-with-policy-service');
var restSerializer = require('../../../serializers/rest-serializer');
var restful = require('../../../services/restful');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

function getTags(tags) {
  if (!Array.isArray(tags)) {
    throw new StatusError(400, 'Tags must be an array.');
  }
  return tags.map(function(tag) {
    return String(tag);
  });
}

function getCreateTopicOptions(body) {
  var title = body.title ? String(body.title) : undefined;
  var slug = body.slug ? String(body.slug) : undefined;
  var tags = body.tags ? getTags(body.tags) : undefined;
  var sticky = body.sticky ? parseInt(body.sticky, 10) : undefined;
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

    return restful.serializeTopicsForForumId(forum._id);
  },

  show: function(req) {
    var topic = req.topic;
    var strategy = restSerializer.TopicStrategy.full();
    return restSerializer.serializeObject(topic, strategy);
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

    var topicOptions = getCreateTopicOptions(req.body);

    return forumCategoryService.findByIdForForum(forum._id, categoryId)
      .then(function(category) {
        if (!category) throw new StatusError(404, 'Category not found.');

        var forumWithPolicyService = new ForumWithPolicyService(forum, user, policy);
        return forumWithPolicyService.createTopic(category, topicOptions);
      })
      .then(function(topic) {
        var topicStrategy = restSerializer.TopicStrategy.standard();
        return restSerializer.serializeObject(topic, topicStrategy);
      });
  },

  patch: function(req) {
    var user = req.user;
    var forum = req.forum;
    var policy = req.userForumPolicy;
    var topic = req.topic;

    var forumWithPolicyService = new ForumWithPolicyService(forum, user, policy);
    var body = req.body;
    var promises = [];

    var title;
    if (body.hasOwnProperty('title')) {
      title = String(body.title);
      promises.push(forumWithPolicyService.setTopicTitle(topic, title));
    }

    var slug;
    if (body.hasOwnProperty('slug')) {
      slug = String(body.slug);
      promises.push(forumWithPolicyService.setTopicSlug(topic, slug));
    }

    var tags;
    if (body.hasOwnProperty('tags')) {
      tags = getTags(body.tags);
      promises.push(forumWithPolicyService.setTopicTags(topic, tags));
    }

    var sticky;
    if (body.hasOwnProperty('sticky')) {
      sticky = parseInt(body.sticky, 10);
      promises.push(forumWithPolicyService.setTopicSticky(topic, sticky));
    }

    var text;
    if (body.hasOwnProperty('text')) {
      text = String(body.text);
      promises.push(forumWithPolicyService.setTopicText(topic, text));
    }

    var categoryId;
    var categoryPromise;
    if (body.hasOwnProperty('categoryId')) {
      categoryId = String(body.categoryId);
      categoryPromise = forumCategoryService.findByIdForForum(forum._id, categoryId)
        .then(function(category) {
          if (!category) throw new StatusError(404, 'Category not found.');
          return forumWithPolicyService.setTopicCategory(topic, category);
        });
      promises.push(categoryPromise);
    }

    return Promise.all(promises)
      .then(function() {
        return topicService.findByIdForForum(forum._id, topic._id);
      })
      .then(function(updatedTopic) {
        var strategy = restSerializer.TopicStrategy.standard();
        return restSerializer.serializeObject(updatedTopic, strategy);
      });
  },

  load: function(req, id) {
    if (!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

    return topicService.findByIdForForum(req.forum._id, id);
  },

  subresources: {
    'replies': require('./replies'),
  },

};
