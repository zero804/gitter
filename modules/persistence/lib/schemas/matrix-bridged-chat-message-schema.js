'use strict';

const mongoose = require('gitter-web-mongoose-bluebird');
const Schema = mongoose.Schema;

const MatrixBridgedChatMessageSchema = new Schema(
  {
    gitterMessageId: { type: Schema.ObjectId, required: true },
    matrixRoomId: { type: String, required: true },
    matrixEventId: { type: String, required: true }
  },
  { strict: 'throw' }
);

MatrixBridgedChatMessageSchema.schemaTypeName = 'MatrixBridgedChatMessageSchema';
MatrixBridgedChatMessageSchema.index({ gitterMessageId: 1 }, { unique: true, sparse: true });
MatrixBridgedChatMessageSchema.index(
  { matrixRoomId: 1, matrixEventId: 1 },
  { unique: true, sparse: true }
);

module.exports = {
  install: function(mongooseConnection) {
    const Model = mongooseConnection.model(
      'MatrixBridgedChatMessage',
      MatrixBridgedChatMessageSchema
    );

    return {
      model: Model,
      schema: MatrixBridgedChatMessageSchema
    };
  }
};
