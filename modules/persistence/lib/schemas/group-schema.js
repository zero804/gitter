'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var GroupSchema = new Schema({
  name: { type: String, required: true },
  uri: { type: String, required: true },
  lcUri: { type: String, required: true },
  forumId: { type: ObjectId, required: false },
}, { strict: true });

GroupSchema.schemaTypeName = 'GroupSchema';
GroupSchema.index({ lcUri: 1 }, { unique: true });
GroupSchema.index({ forumId: 1 }, { unique: true, sparse: true });

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('Group', GroupSchema);
    return {
      model: model,
      schema: GroupSchema
    };
  }
};
