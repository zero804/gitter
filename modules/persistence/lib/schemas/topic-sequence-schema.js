'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var TopicSequenceSchema = new Schema({
  forumId: { type: ObjectId, required: true },
  current: { type: Number, required: true }
}, { strict: 'throw' });

TopicSequenceSchema.schemaTypeName = 'TopicSequenceSchema';
TopicSequenceSchema.index({ forumId: 1 });

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('TopicSequence', TopicSequenceSchema);

    return {
      model: Model,
      schema: TopicSequenceSchema
    };
  }
};
