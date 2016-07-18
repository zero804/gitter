'use strict';

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var securityDescriptor = require('./security-descriptor-subdocument');

var GroupSchema = new Schema({
  name: { type: String, required: true },
  uri: { type: String, required: true },
  lcUri: { type: String, required: true },
  forumId: { type: ObjectId, required: false },
  sd: { type: securityDescriptor.Schema, required: false },
  avatarUrl: { type: String, required: false },
  avatarVersion: { type: Number, required: false, default: 0 }

}, { strict: 'throw' });

GroupSchema.schemaTypeName = 'GroupSchema';
GroupSchema.index({ lcUri: 1 }, { unique: true });
GroupSchema.index({ forumId: 1 }, { unique: true, sparse: true });

module.exports = {
  install: function(mongooseConnection) {
    var Model = mongooseConnection.model('Group', GroupSchema);

    securityDescriptor.installIndexes(GroupSchema, Model);

    return {
      model: Model,
      schema: GroupSchema
    };
  }
};
