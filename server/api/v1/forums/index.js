"use strict";

var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var forumService = require('gitter-web-forums/lib/forum-service');
var restSerializer = require('../../../serializers/rest-serializer');


module.exports = {
  id: 'forum',

  show: function(req) {
    var forum = req.forum;
    var user = req.user;
    var strategy = new restSerializer.ForumStrategy();
    return restSerializer.serializeObject(forum, strategy);
  },

  load: function(req, id) {
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
