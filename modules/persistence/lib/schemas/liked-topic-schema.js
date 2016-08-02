'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;


var LikedTopicSchema = new Schema({
  topicId: { type: ObjectId, required: true },
  userId: {type: ObjectId, required: true},
}, { strict: 'throw' });

LikedTopicSchema.schemaTypeName = 'LikedTopicSchema';
LikedTopicSchema.index({ topicId: 1, userId: 1 }, { unique: true });
// do we need an index on topicId if we have one on both topicId & userId?
// Looks like according to the documentation mongo can use the first part of a
// multi-key index.
LikedTopicSchema.index({ topicId: 1 });
LikedTopicSchema.index({ userId: 1 });

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('LikedTopic', LikedTopicSchema);

    return {
      model: Model,
      schema: LikedTopicSchema
    };
  }
};
