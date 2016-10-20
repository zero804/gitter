'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ForumReactionSchema = new Schema({
  userId: { type: ObjectId, required: true },
  forumId: { type: ObjectId, required: true },
  topicId: { type: ObjectId, required: true },
  replyId: { type: ObjectId },
  commentId: { type: ObjectId },
  reaction: { type: String, required: true }
}, { strict: 'throw' });

ForumReactionSchema.schemaTypeName = 'ForumReactionSchema';

ForumReactionSchema.index({ topicId: 1 }, { background: true });
ForumReactionSchema.index({ replyId: 1 }, { background: true });
ForumReactionSchema.index({ commentId: 1 }, {background: true });

ForumReactionSchema.index({
  userId: 1,
  forumId: 1,
  topicId: 1,
  replyId: 1,
  commentId: 1,
  reaction: 1,
}, {
  background: true,
  unique: true,
});

ForumReactionSchema.index({
  forumId: 1,
  topicId: 1,
  replyId: 1,
  commentId: 1,
}, {
  background: true,
});

ForumReactionSchema.extraIndices = [{
  /* Topic Reactions Partial Index */
  keys: {
    userId: 1,
    topicId: 1,
  },
  options: {
    background: true,
    unique: true,
    partialFilterExpression: {
      replyId: { $eq: null },
      commentId: { $eq: null }
    },
  }
}, {
  /* Reply Reactions Partial Index */
  keys: {
    userId: 1,
    replyId: 1,
  },
  options: {
    background: true,
    unique: true,
    partialFilterExpression: {
      topicId: { $type: 'objectId' }, // Equiv: Not null
      replyId: { $type: 'objectId' }, // Equiv: Not null
      commentId: { $eq: null }
    },
  }
}, {
  /* Comment Reactions Partial Index */
  keys: {
    userId: 1,
    commentId: 1,
  },
  options: {
    background: true,
    unique: true,
    partialFilterExpression: {
      topicId: { $type: 'objectId' }, // Equiv: Not null
      replyId: { $type: 'objectId' }, // Equiv: Not null
      commentId: { $type: 'objectId' }, // Equiv: Not null
    },
  }
}];

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('ForumReaction', ForumReactionSchema);

    return {
      model: Model,
      schema: ForumReactionSchema
    };
  }
};
