"use strict";

var Promise = require('bluebird');
var StatusError = require('statuserror');
var fakeData = require('gitter-web-fake-data');
var internalClientAccessOnly = require('../../../web/middlewares/internal-client-access-only');
var forumService = require('gitter-web-forums/lib/forum-service');
var topicService = require('gitter-web-topics/lib/topic-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var ForumWithPolicyService = require('../../../services/forum-with-policy-service');
var restSerializer = require('../../../serializers/rest-serializer');


function getReplyOptions(body) {
  var text = body.text ? String(body.text) : undefined;

  return {
    // required:
    text: text,
  };
}

module.exports = {
  id: 'replyId',

  index: function() {
    return Promise.resolve(fakeData.getReplies());
  },

  show: function() {
    return Promise.resolve(fakeData.getReply());
  },

  create: function(req) {
    var user = req.user;

    // This is for internal clients only
    if (!internalClientAccessOnly.isRequestFromInternalClient(req)) {
      throw new StatusError(404);
    }

    if (!user) throw new StatusError(401);

    var replyOptions = getReplyOptions(req.body);

    // TODO: This should be handled by load methods in api/v1/forums/index.js
    // and api/v1/forums/topics.js, but we can't do that yet, because the other
    // routes still have to return fake data for the moment and we don't want
    // that throwing a 404.
    return Promise.join(
        forumService.findById(req.params.forumId),
        topicService.findByIdForForum(req.params.forumId, req.params.topicId)
      )
      .bind({})
      .spread(function(forum, topic) {
        if (!forum) throw new StatusError(404, 'Forum not found.');
        if (!topic) throw new StatusError(404, 'Topic not found.');

        this.forum = forum;
        this.topic = topic;

        // TODO: this can probably also be moved to middleware
        return policyFactory.createPolicyForForum(user, forum);
      })
      .then(function(policy) {
        var forumWithPolicyService = new ForumWithPolicyService(this.forum, user, policy);
        return forumWithPolicyService.createReply(this.topic, replyOptions);
      })
      .then(function(reply) {
        var replyStrategy = new restSerializer.ReplyStrategy();
        return restSerializer.serializeObject(reply, replyStrategy);
      });
  },

  subresources: {
    'comments': require('./comments'),
  },
};
