'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var ForumSchema = new Schema({
  name: { type: String, required: true },
  uri: { type: String, required: true },
  lcUri: { type: String, required: true },
  // NOTE: assuming no groupId as forums could be for anything
  defaultCategoryId: { type: ObjectId },
  defaultTopicId: { type: ObjectId },
  // TODO: tags as a separate collection or just an array? Assuming categories
  // is a separate collection.
  // TODO: are we maintaining topicsTotal?
}, { strict: 'throw' });

ForumSchema.schemaTypeName = 'ForumSchema';
ForumSchema.index({ lcUri: 1 });

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Forum', ForumSchema);

    return {
      model: Model,
      schema: ForumSchema
    };
  }
};
