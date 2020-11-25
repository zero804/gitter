'use strict';

const debug = require('debug')('gitter:app:matrix-bridge:gitter-bridge');
const assert = require('assert');
const StatusError = require('statuserror');
const appEvents = require('gitter-web-appevents');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const securityDescriptorUtils = require('gitter-web-permissions/lib/security-descriptor-utils');
const env = require('gitter-web-env');
const logger = env.logger;
const config = env.config;
const stats = env.stats;
const errorReporter = env.errorReporter;

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

async function isRoomAllowedToBridge(gitterRoomId) {
  // Only public rooms can bridge messages
  const gitterRoom = await troupeService.findById(gitterRoomId);
  const isPublic = securityDescriptorUtils.isPublic(gitterRoom);
  if (!isPublic) {
    return false;
  }

  // If no allowlist was configured, then allow any room to bridge (useful to wildcard all testing in dev/beta).
  if (!allowedRoomMap) {
    return true;
  }

  // In production, we limit the rooms that are bridged in our initial testing phase
  // to limit any bad side-effects that may occur.
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
    try {
      debug('onDataChange', data);
      // Ignore data without a URL or model
      if (!data.url || !data.model) {
        throw new StatusError(
          400,
          'Gitter data from onDataChange2(data) did not include URL or model'
        );
      }

      const [, gitterRoomId] = data.url.match(/\/rooms\/([a-f0-9]+)\/chatMessages/) || [];
      if (gitterRoomId && data.operation === 'create') {
        return await this.handleChatMessageCreateEvent(gitterRoomId, data.model);
      } else if (gitterRoomId && data.operation === 'update') {
        return await this.handleChatMessageEditEvent(gitterRoomId, data.model);
      } else if (gitterRoomId && data.operation === 'remove') {
        return await this.handleChatMessageRemoveEvent(gitterRoomId, data.model);
      }

      // TODO: Handle user data change and update Matrix user
    } catch (err) {
      logger.error(`Error while processing Gitter event: ${err}`, {
        exception: err
      });
      errorReporter(
        err,
        { operation: 'gitterBridge.onDataChange', data: data },
        { module: 'gitter-to-matrix-bridge' }
      );
    }

    return null;
  }

  async handleChatMessageCreateEvent(gitterRoomId, model) {
    const allowedToBridge = await isRoomAllowedToBridge(gitterRoomId);
    if (!allowedToBridge) {
      return null;
    }

    // Supress any echo that comes from Matrix bridge itself creating new messages
    if (model.virtualUser && model.virtualUser.type === 'matrix') {
      return null;
    }

    const matrixRoomId = await this.matrixUtils.getOrCreateMatrixRoomByGitterRoomId(gitterRoomId);

    if (!model.fromUser) {
      throw new StatusError(400, 'message.fromUser does not exist');
    }

    // Handle threaded conversations
    let parentMatrixEventId;
    if (model.parentId) {
      parentMatrixEventId = await store.getMatrixEventIdByGitterMessageId(model.parentId);
    }

    // Send the message to the Matrix room
    const matrixId = await this.matrixUtils.getOrCreateMatrixUserByGitterUserId(model.fromUser.id);
    logger.info(
      `Sending message to Matrix room (Gitter gitterRoomId=${gitterRoomId} -> Matrix gitterRoomId=${matrixRoomId}) (via user mxid=${matrixId})`
    );
    const intent = this.matrixBridge.getIntent(matrixId);
    const matrixContent = {
      body: model.text,
      format: 'org.matrix.custom.html',
      formatted_body: model.html,
      msgtype: 'm.text'
    };

    // Handle threaded conversations
    if (parentMatrixEventId) {
      matrixContent['m.relates_to'] = {
        'm.in_reply_to': {
          event_id: parentMatrixEventId
        }
      };
    }

    const { event_id } = await intent.sendMessage(matrixRoomId, matrixContent);

    // Store the message so we can reference it in edits and threads/replies
    logger.info(
      `Storing bridged message (Gitter message id=${model.id} -> Matrix event_id=${event_id})`
    );
    await store.storeBridgedMessage(model.id, event_id);

    return null;
  }

  async handleChatMessageEditEvent(gitterRoomId, model) {
    const allowedToBridge = await isRoomAllowedToBridge(gitterRoomId);
    if (!allowedToBridge) {
      return null;
    }

    // Supress any echo that comes from Matrix bridge itself creating new messages
    if (model.virtualUser && model.virtualUser.type === 'matrix') {
      return null;
    }

    const matrixEventId = await store.getMatrixEventIdByGitterMessageId(model.id);

    // No matching message on the Matrix side. Let's just ignore the edit as this is some edge case.
    if (!matrixEventId) {
      debug(
        `Ignoring message edit from Gitter side(id=${model.id}) because there is no associated Matrix event ID`
      );
      stats.event('matrix_bridge.ignored_gitter_message_edit', {
        gitterMessageId: model.id
      });
      return null;
    }

    const matrixRoomId = await this.matrixUtils.getOrCreateMatrixRoomByGitterRoomId(gitterRoomId);

    const matrixId = await this.matrixUtils.getOrCreateMatrixUserByGitterUserId(model.fromUser.id);
    const intent = this.matrixBridge.getIntent(matrixId);

    const matrixContent = {
      body: `* ${model.text}`,
      format: 'org.matrix.custom.html',
      formatted_body: `* ${model.html}`,
      msgtype: 'm.text',
      'm.new_content': {
        body: model.text,
        format: 'org.matrix.custom.html',
        formatted_body: model.html,
        msgtype: 'm.text'
      },
      'm.relates_to': {
        event_id: matrixEventId,
        rel_type: 'm.replace'
      }
    };
    await intent.sendMessage(matrixRoomId, matrixContent);

    return null;
  }

  async handleChatMessageRemoveEvent(gitterRoomId, model) {
    const allowedToBridge = await isRoomAllowedToBridge(gitterRoomId);
    if (!allowedToBridge) {
      return null;
    }

    // Supress any echo that comes from Matrix bridge itself creating new messages
    if (model.virtualUser && model.virtualUser.type === 'matrix') {
      return null;
    }

    const matrixEventId = await store.getMatrixEventIdByGitterMessageId(model.id);

    // No matching message on the Matrix side. Let's just ignore the remove as this is some edge case.
    if (!matrixEventId) {
      debug(
        `Ignoring message removal for id=${model.id} from Gitter because there is no associated Matrix event ID`
      );
      stats.event('matrix_bridge.ignored_gitter_message_remove', {
        gitterMessageId: model.id
      });
      return null;
    }

    const matrixRoomId = await this.matrixUtils.getOrCreateMatrixRoomByGitterRoomId(gitterRoomId);

    const intent = this.matrixBridge.getIntent();
    let senderIntent;
    try {
      const event = await intent.getEvent(matrixRoomId, matrixEventId);
      senderIntent = this.matrixBridge.getIntent(event.sender);
    } catch (err) {
      logger.info(
        `handleChatMessageRemoveEvent(): Using bridging user intent because Matrix API call failed, intent.getEvent(${matrixRoomId}, ${matrixEventId})`
      );
      // We'll just use the bridge intent if we can't use their own user
      senderIntent = intent;
    }

    await senderIntent.getClient().redactEvent(matrixRoomId, matrixEventId);

    return null;
  }
}

module.exports = GitterBridge;
