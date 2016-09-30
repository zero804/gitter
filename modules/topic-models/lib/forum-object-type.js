'use strict';

var persistence = require('gitter-web-persistence');
var liveCollections = require('gitter-web-live-collection-events');

var TYPE = {
  Forum: {
    model: persistence.Forum,
    getQuery: function(item) {
      return {
        _id: item.forumId
      };
    },
    liveCollectionPatch: function(/*item, patch*/) {
      // TODO: add a patch
    }
  },
  Topic: {
    model: persistence.Topic,
    getQuery: function(item) {
      return {
        _id: item.topicId,
        forumId: item.forumId
      };
    },
    liveCollectionPatch: function(item, patch) {
      return liveCollections.topics.emit('patch', item.forumId, item.topicId, patch);
    }
  },
  Reply: {
    model: persistence.Reply,
    getQuery: function(item) {
      return {
        _id: item.replyId,
        forumId: item.forumId,
        topicId: item.topicId,
      };
    },
    liveCollectionPatch: function(item, patch) {
      return liveCollections.replies.emit('patch', item.forumId, item.topicId, item.replyId, patch);
    }
  },
  Comment: {
    model: persistence.Comment,
    getQuery: function(item) {
      return {
        _id: item.commentId,
        forumId: item.forumId,
        topicId: item.topicId,
        replyId: item.replyId
      };
    },
    liveCollectionPatch: function(item, patch) {
      return liveCollections.comments.emit('patch', item.forumId, item.topicId, item.replyId, item.commentId, patch);
    }
  }
}

module.exports = TYPE;
