'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var securityDescriptor = require('./security-descriptor-subdocument');

var ForumSchema = new Schema({
  tags: [String],
  sd: { type: securityDescriptor.Schema, required: true },
}, { strict: 'throw' });

ForumSchema.schemaTypeName = 'ForumSchema';

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Forum', ForumSchema);

    securityDescriptor.installIndexes(ForumSchema, Model);

    return {
      model: Model,
      schema: ForumSchema
    };
  }
};
