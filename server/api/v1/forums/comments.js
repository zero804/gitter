"use strict";

var Promise = require('bluebird');
var StatusError = require('statuserror');
var internalClientAccessOnly = require('../../../web/middlewares/internal-client-access-only');
var commentService = require('gitter-web-topics/lib/comment-service');
var ForumWithPolicyService = require('../../../services/forum-with-policy-service');
var restSerializer = require('../../../serializers/rest-serializer');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');


function getCommentOptions(body) {
  var text = body.text ? String(body.text) : undefined;

  return {
    // required:
    text: text,
  };
}

module.exports = {
  id: 'comment',

  index: function(req) {
    var reply = req.reply;

    // TODO: don't just return all the comments, return a sample
    return commentService.findByReplyId(reply._id)
      .then(function(comments) {
        var strategy = new restSerializer.CommentStrategy();
        return restSerializer.serialize(comments, strategy);
      });
  },

  show: function(req) {
    var comment = req.comment;
    var strategy = new restSerializer.CommentStrategy();
    return restSerializer.serializeObject(comment, strategy);
  },

  load: function(req, id) {
    if (!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

    return commentService.findByIdForForumTopicAndReply(req.forum._id, req.topic._id, req.reply._id, id);
  },

  create: function(req) {
    var user = req.user;
    var forum = req.forum;
    var reply = req.reply;
    var policy = req.userForumPolicy;

    // This is for internal clients only
    if (!internalClientAccessOnly.isRequestFromInternalClient(req)) {
      throw new StatusError(404);
    }

    if (!user) throw new StatusError(401);

    var commentOptions = getCommentOptions(req.body);

    var forumWithPolicyService = new ForumWithPolicyService(forum, user, policy);
    return forumWithPolicyService.createComment(reply, commentOptions)
      .then(function(comment) {
        var commentStrategy = new restSerializer.CommentStrategy();
        return restSerializer.serializeObject(comment, commentStrategy);
      });
  },
};
