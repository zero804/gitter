'use strict';

const assert = require('assert');
const StatusError = require('statuserror');
const appEvents = require('gitter-web-appevents');
const env = require('gitter-web-env');
const logger = env.logger;

const store = require('./store');
const MatrixUtils = require('./matrix-utils');

class GitterBridge {
  constructor(matrixBridge) {
    assert(matrixBridge);
    this.matrixBridge = matrixBridge;
    this.matrixUtils = new MatrixUtils(matrixBridge);

    appEvents.onDataChange2(this.onDataChange.bind(this));
  }

  async onDataChange(data) {
    console.log('onDataChange2 data', data);

    // Ignore data without a URL or model
    if (!data.url || !data.model) {
      throw new StatusError(
        400,
        'Gitter data from onDataChange2(data) did not include URL or model'
      );
    }

    const [, roomId] = data.url.match(/\/rooms\/([a-f0-9]+)\/chatMessages/) || [];
    if (roomId && data.operation === 'create') {
      this.handleChatMessageCreateEvent(roomId, data.model);
    }
    // TODO: Handle message edit

    // TODO: Handle user data change and update Matrix user
  }

  async handleChatMessageCreateEvent(roomId, model) {
    const matrixRoomId = await this.matrixUtils.getOrCreateMatrixRoomByGitterRoomId(roomId);

    // Supress any echo that comes from Matrix bridge itself creating new messages
    if (model.virtualUser && model.virtualUser.type === 'matrix') {
      return;
    }

    if (!model.fromUser) {
      throw new StatusError(400, 'message.fromUser does not exist');
    }

    // Send the message to the Matrix room
    const matrixId = await this.matrixUtils.getOrCreateMatrixUserByGitterUserId(model.fromUser.id);
    logger.info(
      `Sending message to Matrix room (Gitter roomId=${roomId} -> Matrix roomId=${matrixRoomId}) (via user mxid=${matrixId})`
    );
    const intent = this.matrixBridge.getIntent(matrixId);
    const content = {
      body: model.text,
      format: 'org.matrix.custom.html',
      formatted_body: model.html,
      msgtype: 'm.text'
    };
    const { event_id } = await intent.sendMessage(matrixRoomId, content);

    // Store the message so we can reference it in edits and threads/replies
    await store.storeBridgedMessage(model.id, event_id);
  }
}

module.exports = GitterBridge;
