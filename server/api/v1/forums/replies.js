"use strict";

var StatusError = require('statuserror');
var internalClientAccessOnly = require('../../../web/middlewares/internal-client-access-only');
var replyService = require('gitter-web-topics/lib/reply-service');
var ForumWithPolicyService = require('../../../services/forum-with-policy-service');
var restSerializer = require('../../../serializers/rest-serializer');
var restful = require('../../../services/restful');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var SubscribersResource = require('./subscribers-resource');
var ForumObject = require('gitter-web-topic-notifications/lib/forum-object');


function getReplyOptions(body) {
  var text = body.text ? String(body.text) : undefined;

  return {
    // required:
    text: text,
  };
}

module.exports = {
  id: 'reply',

  index: function(req) {
    var topic = req.topic;

    return restful.serializeRepliesForTopicId(topic._id);
  },

  show: function(req) {
    var reply = req.reply;
    var strategy = new restSerializer.ReplyStrategy({
      includeComments: true,
      includeCommentsTotals: true,
    });
    return restSerializer.serializeObject(reply, strategy);
  },

  load: function(req, id) {
    if (!mongoUtils.isLikeObjectId(id)) throw new StatusError(400);

    return replyService.findByIdForForumAndTopic(req.forum._id, req.topic._id, id);
  },

  create: function(req) {
    var user = req.user;
    var forum = req.forum;
    var topic = req.topic;
    var policy = req.userForumPolicy;

    // This is for internal clients only
    if (!internalClientAccessOnly.isRequestFromInternalClient(req)) {
      throw new StatusError(404);
    }

    if (!user) throw new StatusError(401);

    var replyOptions = getReplyOptions(req.body);

    var forumWithPolicyService = new ForumWithPolicyService(forum, user, policy);
    return forumWithPolicyService.createReply(topic, replyOptions)
      .then(function(reply) {
        var replyStrategy = new restSerializer.ReplyStrategy();
        return restSerializer.serializeObject(reply, replyStrategy);
      });
  },

  subresources: {
    'comments': require('./comments'),
    'subscribers': new SubscribersResource({
      id: 'replySubscriber',
      getForumObject: function(req) {
        return ForumObject.createForReply(req.forum._id, req.topic._id, req.reply._id);
      }
    })
  },
};
