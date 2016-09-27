'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var securityDescriptor = require('./security-descriptor-subdocument');

var ForumSchema = new Schema({
  name: { type: String, required: true },
  uri: { type: String, required: true },
  lcUri: { type: String, required: true },
  tags: [String],
  sd: { type: securityDescriptor.Schema, required: true },
}, { strict: 'throw' });

ForumSchema.schemaTypeName = 'ForumSchema';

ForumSchema.index({ lcUri: 1 }, { unique: true });

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Forum', ForumSchema);

    return {
      model: Model,
      schema: ForumSchema
    };
  }
};
