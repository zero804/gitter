"use strict";

var Promise = require('bluebird');
var StatusError = require('statuserror');
var fakeData = require('gitter-web-fake-data');
var internalClientAccessOnly = require('../../../web/middlewares/internal-client-access-only');
var forumService = require('gitter-web-forums/lib/forum-service');
var replyService = require('gitter-web-replies/lib/reply-service');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var ForumWithPolicyService = require('../../../services/forum-with-policy-service');
var restSerializer = require('../../../serializers/rest-serializer');


function getCommentOptions(body) {
  var text = body.text ? String(body.text) : undefined;

  return {
    // required:
    text: text,
  };
}

module.exports = {

  id: 'commentId',

  index: function() {
    return Promise.resolve(fakeData.getComments());
  },

  show: function() {
    return Promise.resolve(fakeData.getComment());
  },

  create: function(req) {
    var user = req.user;

    // This is for internal clients only
    if (!internalClientAccessOnly.isRequestFromInternalClient(req)) {
      throw new StatusError(404);
    }

    if (!user) throw new StatusError(401);

    var commentOptions = getCommentOptions(req.body);

    // TODO: This should be handled by load methods in api/v1/forums/index.js,
    // api/v1/forums/topics.js and api/v1/forums/replies.js, but we can't do
    // that yet, because the other routes still have to return fake data for
    // the moment and we don't want that throwing a 404.
    return Promise.join(
        forumService.findById(req.params.forumId),
        replyService.findByIdForForumAndTopic(req.params.forumId, req.params.topicId, req.params.replyId)
      )
      .bind({})
      .spread(function(forum, reply) {
        if (!forum) throw new StatusError(404, 'Forum not found.');
        if (!reply) throw new StatusError(404, 'Reply not found.');

        this.forum = forum;
        this.reply = reply;

        // TODO: this can probably also be moved to middleware
        return policyFactory.createPolicyForForum(user, forum);
      })
      .then(function(policy) {
        var forumWithPolicyService = new ForumWithPolicyService(this.forum, user, policy);
        return forumWithPolicyService.createComment(this.reply, commentOptions);
      })
      .then(function(comment) {
        var commentStrategy = new restSerializer.CommentStrategy();
        return restSerializer.serializeObject(comment, commentStrategy);
      });
  },
};
