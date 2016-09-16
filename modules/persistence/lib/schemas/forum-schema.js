'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var securityDescriptor = require('./security-descriptor-subdocument');

var ForumSchema = new Schema({
  tags: [String],
  sd: { type: securityDescriptor.Schema, required: true },
  topicsTotal: { type: Number, "default": 0 },
}, { strict: 'throw' });

ForumSchema.schemaTypeName = 'ForumSchema';
ForumSchema.index({ topicsTotal: 1 });

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Forum', ForumSchema);

    return {
      model: Model,
      schema: ForumSchema
    };
  }
};
