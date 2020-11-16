'use strict';

const mongoose = require('gitter-web-mongoose-bluebird');
const Schema = mongoose.Schema;

const MatrixBridgedRoomSchema = new Schema(
  {
    troupeId: { type: Schema.ObjectId, required: true },
    matrixRoomId: { type: String, required: true }
  },
  { strict: 'throw' }
);

MatrixBridgedRoomSchema.schemaTypeName = 'MatrixBridgedRoomSchema';
MatrixBridgedRoomSchema.index({ troupeId: 1 }, { unique: true, sparse: true });
MatrixBridgedRoomSchema.index({ matrixRoomId: 1 }, { unique: true, sparse: true });

module.exports = {
  install: function(mongooseConnection) {
    const Model = mongooseConnection.model('MatrixBridgedRoom', MatrixBridgedRoomSchema);

    return {
      model: Model,
      schema: MatrixBridgedRoomSchema
    };
  }
};
