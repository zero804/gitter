"use strict";

var Promise = require('bluebird');
var StatusError = require('statuserror');
var internalClientAccessOnly = require('../../../web/middlewares/internal-client-access-only');
var forumCategoryService = require('gitter-web-topics/lib/forum-category-service');
var ForumWithPolicyService = require('../../../services/forum-with-policy-service');
var restSerializer = require('../../../serializers/rest-serializer');
var restful = require('../../../services/restful');
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

function collectPatchActions(forumWithPolicyService, category, body) {
  var promises = [];

  var fields;
  if (body.hasOwnProperty('name') || body.hasOwnProperty('slug')) {
    fields = {};

    if (body.hasOwnProperty('name')) {
      fields.name = String(body.name);
    }

    if (body.hasOwnProperty('slug')) {
      fields.slug = String(body.slug);
    }

    promises.push(forumWithPolicyService.updateCategory(category, fields));

  var adminOnly;
  if (body.hasOwnProperty('adminOnly')) {
    adminOnly = !!body.adminOnly;
    promises.push(forumWithPolicyService.setCategoryAdminOnly(category, adminOnly));
  }
  }

  // TODO: setCategoryOrder

  return promises;
}

module.exports = {
  id: 'forumCategory',

  index: function(req) {
    var forum = req.forum;
    return restful.serializeCategoriesForForumId(forum._id);
  },

  show: function(req) {
    var category = req.forumCategory;
    var strategy = new restSerializer.ForumCategoryStrategy();
    return restSerializer.serializeObject(category, strategy);
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
  },

  patch: function(req) {
    var user = req.user;
    var forum = req.forum;
    var policy = req.userForumPolicy;
    var category = req.forumCategory;

    var forumWithPolicyService = new ForumWithPolicyService(forum, user, policy);
    var promises = collectPatchActions(forumWithPolicyService, category, req.body);

    return Promise.all(promises)
      .then(function() {
        return forumCategoryService.findByIdForForum(forum._id, category._id);
      })
      .then(function(updatedCategory) {
        var strategy = new restSerializer.ForumCategoryStrategy();
        return restSerializer.serializeObject(updatedCategory, strategy);
      });
  },

  destroy: function(req, res) {
    var user = req.user;
    var forum = req.forum;
    var policy = req.userForumPolicy;
    var category = req.forumCategory;

    var forumWithPolicyService = new ForumWithPolicyService(forum, user, policy);
    return forumWithPolicyService.deleteCategory(category)
      .then(function() {
        res.status(204);
        return null;
      });
  },

  load: function(req, id) {
    if (!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

    return forumCategoryService.findByIdForForum(req.forum._id, id);
  },
};
