"use strict";

var StatusError = require('statuserror');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var forumService = require('gitter-web-topics/lib/forum-service');
var getTopicsFilterSortOptions = require('gitter-web-topics/lib/get-topics-filter-sort-options');
var restSerializer = require('../../../serializers/rest-serializer');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var SubscribersResource = require('./subscribers-resource');
var ForumObject = require('gitter-web-topic-notifications/lib/forum-object');

module.exports = {
  id: 'forum',

  show: function(req) {
    var forum = req.forum;
    var topicsOptions = getTopicsFilterSortOptions(req.query);

    var userId = req.user && req.user._id;

    var strategy = new restSerializer.ForumStrategy.full({
      currentUserId: userId,
      topics: topicsOptions
    });

    return restSerializer.serializeObject(forum, strategy);
  },

  load: function(req, id) {
    if (!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

    return policyFactory.createPolicyForForumId(req.user, id)
      .then(function(policy) {
        req.userForumPolicy = policy;

        // TODO: this is no longer required if we're using the policy service
        return req.method === 'GET' ?
          policy.canRead() :
          policy.canWrite();
      })
      .then(function(access) {
        if (!access) return null;

        return forumService.findById(id);
      });
  },

  // TODO: create
  // TODO: change tags?

  subresources: {
    'topics': require('./topics'),
    'categories': require('./categories'),
    'subscribers': new SubscribersResource({
      id: 'forumSubscriber',
      getForumObject: function(req) {
        return ForumObject.createForForum(req.forum._id)
      }
    })
  },

};
