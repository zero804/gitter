'use strict';

const assert = require('assert');
const StatusError = require('statuserror');
const appEvents = require('gitter-web-appevents');
const env = require('gitter-web-env');
const logger = env.logger;
const config = env.config;

const store = require('./store');
const MatrixUtils = require('./matrix-utils');

const gitterRoomAllowList = config.get('matrix:bridge:gitterRoomAllowList');

let allowedRoomMap;
if (gitterRoomAllowList) {
  allowedRoomMap = gitterRoomAllowList.reduce((map, allowedRoomId) => {
    map[allowedRoomId] = true;
    return map;
  }, {});
}

// In production, we limit the rooms that are bridged in our initial testing phase
// to limit any bad side-effects that may occur.
// If no allowlist was configured, then allow any room to bridge (useful to wildcard all testing in dev/beta).
function isRoomAllowedToBridge(gitterRoomId) {
  if (!allowedRoomMap) {
    return true;
  }

  return !!allowedRoomMap[gitterRoomId];
}

class GitterBridge {
  constructor(matrixBridge) {
    assert(matrixBridge);
    this.matrixBridge = matrixBridge;
    this.matrixUtils = new MatrixUtils(matrixBridge);

    appEvents.onDataChange2(this.onDataChange.bind(this));
  }

  async onDataChange(data) {
    // Ignore data without a URL or model
    if (!data.url || !data.model) {
      throw new StatusError(
        400,
        'Gitter data from onDataChange2(data) did not include URL or model'
      );
    }

    const [, gitterRoomId] = data.url.match(/\/rooms\/([a-f0-9]+)\/chatMessages/) || [];
    if (gitterRoomId && data.operation === 'create') {
      await this.handleChatMessageCreateEvent(gitterRoomId, data.model);
    }
    // TODO: Handle message edit

    // TODO: Handle user data change and update Matrix user
  }

  async handleChatMessageCreateEvent(gitterRoomId, model) {
    if (!isRoomAllowedToBridge(gitterRoomId)) {
      return;
    }

    // Supress any echo that comes from Matrix bridge itself creating new messages
    if (model.virtualUser && model.virtualUser.type === 'matrix') {
      return;
    }

    const matrixRoomId = await this.matrixUtils.getOrCreateMatrixRoomByGitterRoomId(gitterRoomId);

    if (!model.fromUser) {
      throw new StatusError(400, 'message.fromUser does not exist');
    }

    // Send the message to the Matrix room
    const matrixId = await this.matrixUtils.getOrCreateMatrixUserByGitterUserId(model.fromUser.id);
    logger.info(
      `Sending message to Matrix room (Gitter gitterRoomId=${gitterRoomId} -> Matrix gitterRoomId=${matrixRoomId}) (via user mxid=${matrixId})`
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
