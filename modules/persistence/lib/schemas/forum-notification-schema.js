'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ForumNotificationSchema = new Schema({
  userId: { type: ObjectId, required: true },
  forumId: { type: ObjectId, required: true },
  topicId: { type: ObjectId, required: true },
  replyId: { type: ObjectId },
  commentId: { type: ObjectId },
  emailSent: { type: Date }
}, { strict: 'throw' });

ForumNotificationSchema.schemaTypeName = 'ForumNotificationSchema';

ForumNotificationSchema.index({
  userId: 1,
  forumId: 1,
  topicId: 1,
  replyId: 1,
  commentId: 1
}, {
  background: true,
  unique: true,
});

// This index allows us to find out who needs an email...
ForumNotificationSchema.extraIndices = [{
  keys: {
    emailSent: 1,
    userId: 1
  },
  options: {
    background: true,
    partialFilterExpression: {
      emailSent: { $eq: null }
    }
  }
}];

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('ForumNotification', ForumNotificationSchema);

    return {
      model: Model,
      schema: ForumNotificationSchema
    };
  }
};
