'use strict';

const mongoose = require('gitter-web-mongoose-bluebird');
const Schema = mongoose.Schema;

const MatrixBridgedUserSchema = new Schema(
  {
    userId: { type: Schema.ObjectId, required: true },
    matrixId: { type: String, required: true }
  },
  { strict: 'throw' }
);

MatrixBridgedUserSchema.schemaTypeName = 'MatrixBridgedUserSchema';
MatrixBridgedUserSchema.index({ userId: 1 }, { unique: true, sparse: true });
MatrixBridgedUserSchema.index({ matrixId: 1 }, { unique: true, sparse: true });

module.exports = {
  install: function(mongooseConnection) {
    const Model = mongooseConnection.model('MatrixBridgedUser', MatrixBridgedUserSchema);

    return {
      model: Model,
      schema: MatrixBridgedUserSchema
    };
  }
};
