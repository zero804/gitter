'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var TopicSchema = new Schema({
  forumId: { type: ObjectId, required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  categoryId: { type: ObjectId, required: true },
  tags: [String],
  repliesTotal: { type: Number, "default": 0 },
  likesTotal: { type: Number, "default": 0 },
  watchingTotal: { type: Number, "default": 0 },
  sticky: { type: Boolean, "default": false},

  // same as replies & comments
  text: { type: String },
  html: { type: String },
  userId: { type: ObjectId, required: true },
  sent: { type: Date, "default": Date.now },
  editedAt: { type: Date, "default": null },
  // last time anything in this topic or in a reply to it or a comment on one
  // of those replies was updated
  updatedAt: { type: Date, "default": null },

  // TODO: should we parse out and store mentions, issues and stuff?
  // TODO: are we going to store "readBy"? (separate)
  // TODO: what about deleting topics/replies/comments? delete from db or flag
  // as deleted?
  // TODO: participatingTotal? commentsTotal?
  // TODO: _tv? _md? lang?

}, { strict: 'throw' });

TopicSchema.schemaTypeName = 'TopicSchema';
// Should any/all of these be sparse?
TopicSchema.index({ forumId: 1 });

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Topic', TopicSchema);

    return {
      model: Model,
      schema: TopicSchema
    };
  }
};
