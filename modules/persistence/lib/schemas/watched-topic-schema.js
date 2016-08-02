'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;


var WatchedTopicSchema = new Schema({
  topicId: { type: ObjectId, required: true },
  userId: {type: ObjectId, required: true},
}, { strict: 'throw' });

WatchedTopicSchema.schemaTypeName = 'WatchedTopicSchema';
WatchedTopicSchema.index({ topicId: 1, userId: 1 }, { unique: true });
// do we need an index on topicId if we have one on both topicId & userId?
// Looks like according to the documentation mongo can use the first part of a
// multi-key index.
WatchedTopicSchema.index({ topicId: 1 });
WatchedTopicSchema.index({ userId: 1 });

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('WatchedTopic', WatchedTopicSchema);

    return {
      model: Model,
      schema: WatchedTopicSchema
    };
  }
};
