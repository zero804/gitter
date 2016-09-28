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

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('ForumReaction', ForumReactionSchema);

    return {
      model: Model,
      schema: ForumReactionSchema
    };
  }
};
