'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var PostSchema = new Schema({
  topicId: { type: ObjectId, required: true },
  // do we need this?
  commentsTotal: { type: Number, "default": 0 },
  // comments have replyId filled in
  replyId: { type: ObjectId, required: false },

  // these fields are all same as topics
  text: { type: String },
  html: { type: String },
  userId: {type: ObjectId, required: true},
  sent: { type: Date, "default": Date.now },
  editedAt: { type: Date, "default": null },
  // last time anything in this reply or in a comment was updated
  updatedAt: { type: Date, "default": null },
}, { strict: 'throw' });

PostSchema.schemaTypeName = 'PostSchema';
PostSchema.index({ topicId: 1 });
PostSchema.index({ replyId: 1 });

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Post', PostSchema);

    return {
      model: Model,
      schema: PostSchema
    };
  }
};
