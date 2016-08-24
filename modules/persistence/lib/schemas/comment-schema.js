'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var installVersionIncMiddleware = require('../install-version-inc-middleware');

var CommentSchema = new Schema({
  forumId: { type: ObjectId, required: true },
  topicId: { type: ObjectId, required: true },
  replyId: { type: ObjectId, required: true },
  text: { type: String },
  html: { type: String },
  userId: {type: ObjectId, required: true},
  sent: { type: Date, "default": Date.now },
  editedAt: { type: Date, "default": null },
  lastModified: { type: Date, "default": null },
  lang: {type: String },
  _tv: { type: 'MongooseNumber', 'default': 0 },
  _md: {type: Number }
}, { strict: 'throw' });

CommentSchema.schemaTypeName = 'CommentSchema';
CommentSchema.index({ forumId: 1 });
CommentSchema.index({ topicId: 1 });
CommentSchema.index({ replyId: 1 });

installVersionIncMiddleware(CommentSchema);

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Comment', CommentSchema);

    return {
      model: Model,
      schema: CommentSchema
    };
  }
};
