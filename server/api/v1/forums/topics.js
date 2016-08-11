"use strict";

var Promise = require('bluebird');
var StatusError = require('statuserror');
var fakeData = require('gitter-web-fake-data');
var internalClientAccessOnly = require('../../../web/middlewares/internal-client-access-only');
var forumService = require('gitter-web-forums/lib/forum-service');
var forumCategoryService = require('gitter-web-forum-categories/lib/forum-category-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var ForumWithPolicyService = require('../../../services/forum-with-policy-service');


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

  id: 'topicId',

  index: function(){
    return Promise.resolve(fakeData.getTopics());
  },

  show: function (){
    return Promise.resolve(fakeData.getTopic());
  },

  create: function(req) {
    var user = req.user;

    // This is for internal clients only
    if (!internalClientAccessOnly.isRequestFromInternalClient(req)) {
      throw new StatusError(404);
    }

    if (!user) throw new StatusError(401);

    // the category gets loaded in separately
    var categoryId = req.body.categoryId ? String(req.body.categoryId) : undefined;
    if (!categoryId) throw new StatusError(400, 'categoryId required.');

    var topicOptions = getTopicOptions(req.body);


    // TODO: This should be handled by a load method in api/v1/forums/index.js,
    // but we can't do that yet, because the other routes still have to return
    // fake data for the moment and we don't want that throwing a 404.
    return Promise.join(
        forumService.findById(req.params.forumId),
        forumCategoryService.findByIdForForum(req.params.forumId, categoryId)
      )
      .bind({})
      .spread(function(forum, category) {
        if (!forum) throw new StatusError(404, 'Forum not found.');
        if (!category) throw new StatusError(404, 'Category not found.');

        this.forum = forum;
        this.category = category;

        // TODO: this can probably also be moved to middleware
        return policyFactory.createPolicyForForum(user, forum);
      })
      .then(function(policy) {
        var forumWithPolicyService = new ForumWithPolicyService(this.forum, user, policy);
        return forumWithPolicyService.createTopic(this.category, topicOptions);
      })
      .then(function(topic) {
        // TODO: use a proper serializer strategy
        return {
          id: topic.id
        };
      });
  },

  subresources: {
    'replies': require('./replies'),
  },

};
