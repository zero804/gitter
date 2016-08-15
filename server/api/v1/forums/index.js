"use strict";

var StatusError = require('statuserror');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var forumService = require('gitter-web-forums/lib/forum-service');
var restSerializer = require('../../../serializers/rest-serializer');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');


module.exports = {
  id: 'forum',

  show: function(req) {
    var forum = req.forum;
    var user = req.user;
    var strategy = new restSerializer.ForumStrategy();
    return restSerializer.serializeObject(forum, strategy);
  },

  load: function(req, id) {
    if (!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

    return policyFactory.createPolicyForForumId(req.user, id)
      .then(function(policy) {
        req.userForumPolicy = policy;

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
    // TODO: categories
  },

};
