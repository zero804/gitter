'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ForumSubscriptionSchema = new Schema({
  userId: { type: ObjectId, required: true },
  forumId: { type: ObjectId, required: true },
  topicId: { type: ObjectId },
  replyId: { type: ObjectId },
  enabled: { type: Boolean }
}, { strict: 'throw' });

ForumSubscriptionSchema.schemaTypeName = 'ForumSubscriptionSchema';

ForumSubscriptionSchema.index({ topicId: 1 }, { background: true });
ForumSubscriptionSchema.index({ replyId: 1 }, { background: true });

ForumSubscriptionSchema.index({
  userId: 1,
  forumId: 1,
  topicId: 1,
  replyId: 1
}, {
  background: true,
  unique: true,
});

ForumSubscriptionSchema.index({
  forumId: 1,
  topicId: 1,
  replyId: 1
}, {
  background: true,
});

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('ForumSubscription', ForumSubscriptionSchema);

    return {
      model: Model,
      schema: ForumSubscriptionSchema
    };
  }
};
