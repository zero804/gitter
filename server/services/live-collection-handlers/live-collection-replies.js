'use strict';

var _ = require('lodash');
var appEvents = require('gitter-web-appevents');
var restSerializer = require('../../serializers/rest-serializer');


function serializeReplyToTopic(operation, reply) {
  var forumId = reply.forumId;
  var topicId = reply.topicId;
  var url = '/forums/' + forumId + '/topics/' + topicId + '/replies';

  var strategy = new restSerializer.ReplyStrategy({
    includeCommentsTotals: true
  });
  return restSerializer.serializeObject(reply, strategy)
    .then(function(serializedReply) {
      appEvents.dataChange2(url, operation, serializedReply, 'reply');
    });
}

var liveCollectionReplies = {
  create: function(reply) {
    return serializeReplyToTopic('create', reply);
  },

  update: function(reply) {
    return serializeReplyToTopic('update', reply);
  },

  patch: function(forumId, topicId, replyId, patch) {
    var url = '/forums/' + forumId + '/topics/' + topicId + '/replies';
    var patchMessage = _.extend({ }, patch, { id: replyId.toString() });
    appEvents.dataChange2(url, 'patch', patchMessage, 'reply');
  },

  remove: function(reply) {
    return this.removeId(reply.forumId, reply.topicId, reply._id);
  },

  removeId: function(forumId, topicId, replyId) {
    var url = '/forums/' + forumId + '/topics/' + topicId + '/replies';
    appEvents.dataChange2(url, 'remove', { id: replyId }, 'reply');
  }
}

module.exports = liveCollectionReplies;
