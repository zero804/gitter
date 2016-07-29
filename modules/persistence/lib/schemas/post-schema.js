'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var PostSchema = new Schema({
  // all of these are only required for topics, not replies and comments
  title: { type: String, required: false },
  uri: { type: String, required: false },
  lcUri: { type: String, required: false },

  // topics, replies and comments all have these
  text: { type: String },
  html: { type: String },
  forumId: { type: ObjectId, required: true },
  // TODO: should this only be on the topic level where it is required or do we
  // denormalize it along with forumId?
  categoryId: { type: ObjectId},
  userId: {type: ObjectId, required: true},
  sent: { type: Date, "default": Date.now },
  editedAt: { type: Date, "default": null },

  // TODO: should we parse out and store mentions, issues and stuff?

  // TODO: are we going to store "readBy"?

  // TODO: what about deleting topics/replies/comments?

  // replies & comments have topicId filled in
  // TODO: can we make it required if replyId is filled in?
  topicId: { type: ObjectId, required: false },

  // comments have replyId filled in
  replyId: { type: ObjectId, required: false },

  // TODO: tags as an array of objectIds or strings?
  // TODO: favouriters, participators, watchers.. how are we storing that?
  // (participators are likely going to be in here, favouriters and watchers
  //  outside if I had to guess)
  // TODO: are we maintaining repliesTotal and commentsTotal?

  // _tv? _md? lang? lastUpdated? (for the entire topic)
}, { strict: 'throw' });

PostSchema.schemaTypeName = 'PostSchema';
// Do we need this one? Apparently a compound index works for the first one in
// the index (forumId in the forumId, lcUri case) too.
PostSchema.index({ forumId: 1 });
// Should any/all of these be sparse?
PostSchema.index({ lcUri: 1 });
PostSchema.index({ forumId: 1, lcUri: 1 }, { unique: true });
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
