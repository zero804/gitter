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
const transformGitterTextIntoMatrixMessage = require('./transform-gitter-text-into-matrix-message');
const checkIfDatesSame = require('./check-if-dates-same');

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

  // eslint-disable-next-line complexity
  async onDataChange(data) {
    try {
      debug('onDataChange', data);
      stats.eventHF('gitter_bridge.event_received');
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
      } else if (gitterRoomId && data.operation === 'update') {
        await this.handleChatMessageEditEvent(gitterRoomId, data.model);
      } else if (gitterRoomId && data.operation === 'remove') {
        await this.handleChatMessageRemoveEvent(gitterRoomId, data.model);
      }

      // TODO: Handle user data change and update Matrix user

      stats.eventHF('gitter_bridge.event.success');
    } catch (err) {
      logger.error(
        `Error while processing Gitter bridge event (url=${data && data.url}, id=${data &&
          data.model &&
          data.model.id}): ${err}`,
        {
          exception: err,
          data
        }
      );
      stats.eventHF('gitter_bridge.event.fail');
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
    const intent = this.matrixBridge.getIntent(matrixId);
    logger.info(
      `Sending message to Matrix room (Gitter gitterRoomId=${gitterRoomId} -> Matrix gitterRoomId=${matrixRoomId}) (via user mxid=${matrixId})`
    );
    stats.event('gitter_bridge.chat_create', {
      gitterRoomId,
      gitterChatId: model.id,
      matrixRoomId,
      mxid: matrixId
    });

    const matrixCompatibleText = transformGitterTextIntoMatrixMessage(model.text);
    const matrixCompatibleHtml = transformGitterTextIntoMatrixMessage(model.html);

    const matrixContent = {
      body: matrixCompatibleText,
      format: 'org.matrix.custom.html',
      formatted_body: matrixCompatibleHtml,
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
      `Storing bridged message (Gitter message id=${model.id} -> Matrix matrixRoomId=${matrixRoomId} event_id=${event_id})`
    );
    await store.storeBridgedMessage(model, matrixRoomId, event_id);

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

    const bridgedMessageEntry = await store.getBridgedMessageEntryByGitterMessageId(model.id);

    // No matching message on the Matrix side. Let's just ignore the edit as this is some edge case.
    if (!bridgedMessageEntry || !bridgedMessageEntry.matrixEventId) {
      debug(
        `Ignoring message edit from Gitter side(id=${model.id}) because there is no associated Matrix event ID`
      );
      stats.event('matrix_bridge.ignored_gitter_message_edit', {
        gitterMessageId: model.id
      });
      return null;
    }

    // Check if the message was actually updated.
    // If there was an `update` data2 event and there was no timestamp change here,
    // it is probably just an update to `threadMessageCount`, etc which we don't need to propogate
    //
    // We use this special date comparison function because:
    //  - `bridgedMessageEntry.editedAt` from the database is a `Date` object{} or `null`
    //  - `model.editedAt` from the event is a `string` or `undefined`
    if (checkIfDatesSame(bridgedMessageEntry.editedAt, model.editedAt)) {
      return null;
    }

    const matrixRoomId = await this.matrixUtils.getOrCreateMatrixRoomByGitterRoomId(gitterRoomId);

    const matrixId = await this.matrixUtils.getOrCreateMatrixUserByGitterUserId(model.fromUser.id);
    const intent = this.matrixBridge.getIntent(matrixId);
    stats.event('gitter_bridge.chat_edit', {
      gitterRoomId,
      gitterChatId: model.id,
      matrixRoomId,
      mxid: matrixId
    });

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
        event_id: bridgedMessageEntry.matrixEventId,
        rel_type: 'm.replace'
      }
    };
    await intent.sendMessage(matrixRoomId, matrixContent);

    // Update the timestamps to compare again next time
    await store.storeUpdatedBridgedGitterMessage(model);

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
    stats.event('gitter_bridge.chat_delete', {
      gitterRoomId,
      gitterChatId: model.id,
      matrixRoomId
    });

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
