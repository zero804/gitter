'use strict';

const mongoose = require('gitter-web-mongoose-bluebird');
const Schema = mongoose.Schema;

const MatrixBridgedChatMessageSchema = new Schema(
  {
    gitterMessageId: { type: Schema.ObjectId, required: true },
    matrixRoomId: { type: String, required: true },
    matrixEventId: { type: String, required: true },
    // We use this to figure out if we should actually send an edit out.
    //
    // If there is a mismatch between these dates and the actual Gitter chatMessage,
    // we can assume there was actually an edit we need to propogate through.
    //
    // If there was no change, the `update` data2 event is probably just an update to `threadMessageCount`, etc
    sent: { type: Date, default: Date.now },
    editedAt: { type: Date, default: null }
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
