'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var GroupSchema = new Schema({
  name: { type: String, required: true },
  uri: { type: String, required: true },
  lcUri: { type: String, required: true },
  type: { type: String },
  githubId: { type: Number, required: false },
  forumId: { type: ObjectId, required: false },
}, { strict: true });

GroupSchema.schemaTypeName = 'GroupSchema';
GroupSchema.index({ lcUri: 1 }, { unique: true });
GroupSchema.index({ forumId: 1 }, { unique: true, sparse: true });
GroupSchema.index({ type: 1, githubId: 1 }, { });

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('Group', GroupSchema);
    return {
      model: model,
      schema: GroupSchema
    };
  }
};
