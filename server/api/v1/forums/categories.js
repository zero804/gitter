"use strict";

var Promise = require('bluebird');
var StatusError = require('statuserror');
var internalClientAccessOnly = require('../../../web/middlewares/internal-client-access-only');
var forumCategoryService = require('gitter-web-forum-categories/lib/forum-category-service');
var ForumWithPolicyService = require('../../../services/forum-with-policy-service');
var restSerializer = require('../../../serializers/rest-serializer');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');


function getCategoryOptions(body) {
  var name = body.name ? String(body.name) : undefined;
  var slug = body.slug ? String(body.slug) : undefined;

  return {
    // required:
    name: name,

    // optional:
    slug: slug,
  };
}

module.exports = {
  id: 'forumCategory',

  index: function(req) {
    var forum = req.forum;

    return forumCategoryService.findByForumId(forum._id)
      .then(function(categories) {
        var strategy = new restSerializer.ForumCategoryStrategy();
        return restSerializer.serialize(categories, strategy);
      });
  },

  show: function(req) {
    var category = req.forumCategory;
    var strategy = new restSerializer.ForumCategoryStrategy();
    return restSerializer.serializeObject(category, strategy);
  },

  load: function(req, id) {
    if (!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

    return forumCategoryService.findByIdForForum(req.forum._id, id);
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

    var categoryOptions = getCategoryOptions(req.body);

    var forumWithPolicyService = new ForumWithPolicyService(forum, user, policy);
    return forumWithPolicyService.createCategory(categoryOptions)
      .then(function(category) {
        var categoryStrategy = new restSerializer.ForumCategoryStrategy();
        return restSerializer.serializeObject(category, categoryStrategy);
      });
  }
};
