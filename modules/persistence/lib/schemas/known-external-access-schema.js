"use strict";

var mongoose = require('gitter-web-mongoose-bluebird');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var KnownExternalAccessSchema = new Schema({
  userId: { type: ObjectId, required: true },
  type: { type: String, required: true },
  policyName: { type: String, required: true },
  linkPath: { type: String },
  externalId: { type: String },
  accessTime: { type: Date, required: true }
}, { strict: 'throw' });

KnownExternalAccessSchema.index({ userId: 1 }, { background: true });
KnownExternalAccessSchema.index({ type: 1, linkPath: 1 }, { background: true });
KnownExternalAccessSchema.index({ type: 1, externalId: 1 }, { background: true });
KnownExternalAccessSchema.schemaTypeName = 'KnownExternalAccessSchema';

module.exports = {
  install: function(mongooseConnection) {
    var model = mongooseConnection.model('KnownExternalAccess', KnownExternalAccessSchema);

    // Unique index on linkPath + user + type
    model.collection.createIndex({
        userId: 1,
        type: 1,
        policyName: 1,
        linkPath: 1,
      } , {
        background: true,
        unique: true,
        partialFilterExpression: {
          linkPath: { $exists: true },
        }
      },
      function(err) {
        if (err) throw err;
      });

    // Unique index on externalId + user + type
    model.collection.createIndex({
        userId: 1,
        type: 1,
        policyName: 1,
        externalId: 1,
      } , {
        background: true,
        unique: true,
        partialFilterExpression: {
          externalId: { $exists: true },
        }
      },
      function(err) {
        if (err) throw err;
      });


    return {
      model: model,
      schema: KnownExternalAccessSchema
    };
  }
};
