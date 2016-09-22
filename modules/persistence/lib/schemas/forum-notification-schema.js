'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ForumNotificationSchema = new Schema({
  userId: { type: ObjectId, required: true },
  forumId: { type: ObjectId, required: true },
  topicId: { type: ObjectId },
  replyId: { type: ObjectId },
}, { strict: 'throw' });

ForumNotificationSchema.schemaTypeName = 'ForumNotificationSchema';

ForumNotificationSchema.index({
  userId: 1,
  forumId: 1,
  topicId: 1,
  replyId: 1
}, {
  background: true,
  unique: true,
});

ForumNotificationSchema.index({
  forumId: 1,
  topicId: 1,
  replyId: 1
}, {
  background: true,
});

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('ForumNotification', ForumNotificationSchema);

    return {
      model: Model,
      schema: ForumNotificationSchema
    };
  }
};
