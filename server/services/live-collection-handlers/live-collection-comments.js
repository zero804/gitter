'use strict';

var _ = require('lodash');
var appEvents = require('gitter-web-appevents');
var restSerializer = require('../../serializers/rest-serializer');


function serializeCommentToReply(operation, comment) {
  var forumId = comment.forumId;
  var topicId = comment.topicId;
  var replyId = comment.replyId;
  var url = '/forums/' + forumId + '/topics/' + topicId + '/replies/' + replyId + '/comments';

  var strategy = restSerializer.CommentStrategy.standard();
  return restSerializer.serializeObject(comment, strategy)
    .then(function(serializedComment) {
      appEvents.dataChange2(url, operation, serializedComment, 'comment');
    });
}

var liveCollectionComments = {
  create: function(comment) {
    return serializeCommentToReply('create', comment);
  },

  update: function(comment) {
    return serializeCommentToReply('update', comment);
  },

  patch: function(forumId, topicId, replyId, commentId, patch) {
    var url = '/forums/' + forumId + '/topics/' + topicId + '/replies/' + replyId + '/comments';
    var patchMessage = _.extend({ }, patch, { id: commentId.toString() });
    appEvents.dataChange2(url, 'patch', patchMessage, 'comment');
  },

  remove: function(comment) {
    return this.removeId(comment.forumId, comment.topicId, comment.replyId, comment._id);
  },

  removeId: function(forumId, topicId, replyId, commentId) {
    var url = '/forums/' + forumId + '/topics/' + topicId + '/replies/' + replyId + '/comments';
    appEvents.dataChange2(url, 'remove', { id: commentId.toString() }, 'comment');
  }
}

module.exports = liveCollectionComments;
