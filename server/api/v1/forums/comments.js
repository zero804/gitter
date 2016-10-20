"use strict";

var Promise = require('bluebird');
var StatusError = require('statuserror');
var internalClientAccessOnly = require('../../../web/middlewares/internal-client-access-only');
var commentService = require('gitter-web-topics/lib/comment-service');
var ForumWithPolicyService = require('../../../services/forum-with-policy-service');
var restSerializer = require('../../../serializers/rest-serializer');
var restful = require('../../../services/restful');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var ForumObject = require('gitter-web-topic-models/lib/forum-object');
var ReactionsResource = require('./reactions-resource');


function getCommentOptions(body) {
  var text = body.text ? String(body.text) : undefined;

  return {
    // required:
    text: text,
  };
}

function collectPatchActions(forumWithPolicyService, comment, body) {
  var promises = [];

  if (body.hasOwnProperty('text')) {
    promises.push(forumWithPolicyService.updateComment(comment, {
      text: String(body.text)
    }));
  }

  return promises;
}

module.exports = {
  id: 'comment',

  index: function(req) {
    var reply = req.reply;
    var userId = req.user && req.user._id;

    return restful.serializeCommentsForReplyId(reply._id, userId);
  },

  show: function(req) {
    var comment = req.comment;
    var strategy = restSerializer.CommentStrategy.standard({
      currentUserId: req.user && req.user._id
    });

    return restSerializer.serializeObject(comment, strategy);
  },

  create: function(req) {
    var user = req.user;
    var forum = req.forum;
    var reply = req.reply;
    var policy = req.userForumPolicy;
    var userId = user && user._id;

    // This is for internal clients only
    if (!internalClientAccessOnly.isRequestFromInternalClient(req)) {
      throw new StatusError(404);
    }

    if (!user) throw new StatusError(401);

    var commentOptions = getCommentOptions(req.body);

    var forumWithPolicyService = new ForumWithPolicyService(forum, user, policy);
    return forumWithPolicyService.createComment(reply, commentOptions)
      .then(function(comment) {
        var commentStrategy = restSerializer.CommentStrategy.standard({
          currentUserId: userId
        });

        return restSerializer.serializeObject(comment, commentStrategy);
      });
  },

  patch: function(req) {
    var user = req.user;
    var forum = req.forum;
    var policy = req.userForumPolicy;
    var comment = req.comment;
    var userId = user && user._id;

    var forumWithPolicyService = new ForumWithPolicyService(forum, user, policy);
    var promises = collectPatchActions(forumWithPolicyService, comment, req.body);

    return Promise.all(promises)
      .then(function() {
        return commentService.findByIdForForumTopicAndReply(forum._id, comment.topicId, comment.replyId, comment._id);
      })
      .then(function(updatedComment) {
        var strategy = restSerializer.CommentStrategy.standard({
          currentUserId: userId
        });
        return restSerializer.serializeObject(updatedComment, strategy);
      });
  },

  destroy: function(req, res) {
    var user = req.user;
    var forum = req.forum;
    var policy = req.userForumPolicy;
    var comment = req.comment;

    var forumWithPolicyService = new ForumWithPolicyService(forum, user, policy);
    return forumWithPolicyService.deleteComment(comment)
      .then(function() {
        res.status(204);
        return null;
      });
  },

  load: function(req, id) {
    if (!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

    return commentService.findByIdForForumTopicAndReply(req.forum._id, req.topic._id, req.reply._id, id);
  },

  subresources: {
    'reactions': new ReactionsResource({
      id: 'commentReaction',
      getForumObject: function(req) {
        return ForumObject.createForComment(req.forum._id, req.topic._id, req.reply._id, req.comment._id);
      }
    })
  },
};
