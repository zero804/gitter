'use strict';

const debug = require('debug')('gitter:app:matrix-bridge:matrix-event-handler');
const assert = require('assert');
const chatService = require('gitter-web-chats');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const userService = require('gitter-web-users');
const store = require('./store');
const env = require('gitter-web-env');
const stats = env.stats;
const logger = env.logger;
const errorReporter = env.errorReporter;

function validateEventForMessageCreateEvent(event) {
  return !event.state_key && event.sender && event.content && event.content.body;
}

function validateEventForMessageEditEvent(event) {
  return (
    !event.state_key &&
    event.sender &&
    event.content &&
    event.content['m.relates_to'] &&
    event.content['m.relates_to'].rel_type === 'm.replace' &&
    event.content['m.new_content'] &&
    event.content['m.new_content'].body &&
    // Only text edits please
    event.content['m.new_content'].msgtype === 'm.text' &&
    event.content['m.relates_to'] &&
    event.content['m.relates_to'].event_id
  );
}

function validateEventForMessageDeleteEvent(event) {
  return !event.state_key && event.sender && event.redacts;
}

class MatrixEventHandler {
  constructor(matrixBridge, gitterBridgeUsername) {
    assert(matrixBridge, 'Matrix bridge required');
    assert(
      gitterBridgeUsername,
      'Gitter bridge username required (the bot user that bridges messages like gitter-badger or matrixbot)'
    );
    this.matrixBridge = matrixBridge;
    this._gitterBridgeUsername = gitterBridgeUsername;
  }

  async onEventData(event) {
    try {
      debug('onEventData', event);
      if (
        event.type === 'm.room.message' &&
        event.content &&
        event.content['m.relates_to'] &&
        event.content['m.relates_to'].rel_type === 'm.replace'
      ) {
        return await this.handleChatMessageEditEvent(event);
      }

      if (event.type === 'm.room.message') {
        return await this.handleChatMessageCreateEvent(event);
      }

      if (event.type === 'm.room.redaction') {
        return await this.handleChatMessageDeleteEvent(event);
      }
    } catch (err) {
      logger.error(err);
      errorReporter(
        err,
        { operation: 'matrixEventHandler.onDataChange', data: event },
        { module: 'matrix-to-gitter-bridge' }
      );
    }
  }

  async handleChatMessageEditEvent(event) {
    // If someone is passing us mangled events, just ignore them.
    if (!validateEventForMessageEditEvent(event)) {
      return;
    }

    const matrixEventId = event.content['m.relates_to'].event_id;
    const gitterMessageId = await store.getGitterMessageIdByMatrixEventId(matrixEventId);

    // No matching message on the Gitter side. Let's just ignore the edit as this is some edge case.
    if (!gitterMessageId) {
      debug(
        `Ignoring message edit from Matrix side(matrixEventId=${matrixEventId}) because there is no associated Gitter message`
      );
      stats.event('matrix_bridge.ignored_matrix_message_edit', {
        matrixEventId
      });
      return null;
    }

    const chatMessage = await chatService.findById(gitterMessageId);

    const gitterRoom = await troupeService.findById(chatMessage.toTroupeId);
    if (!gitterRoom) {
      debug(
        `Ignoring message edit from Matrix side(matrixEventId=${matrixEventId}) because the Gitter room was not found`
      );
      stats.event('matrix_bridge.ignored_matrix_message_edit', {
        matrixEventId
      });
      return null;
    }

    const gitterBridgeUser = await userService.findByUsername(this._gitterBridgeUsername);
    assert(
      gitterBridgeUser,
      `Unable to find bridge user in Gitter database username=${this._gitterBridgeUsername}`
    );

    const newText = event.content['m.new_content'].body;
    await chatService.updateChatMessage(gitterRoom, chatMessage, gitterBridgeUser, newText);

    return null;
  }

  async handleChatMessageCreateEvent(event) {
    // If someone is passing us mangled events, just ignore them.
    if (!validateEventForMessageCreateEvent(event)) {
      return;
    }

    const gitterRoomId = await store.getGitterRoomIdByMatrixRoomId(event.room_id);
    assert(gitterRoomId, `Unable to find gitterRoomId for Matrix room(${event.room_id})`);
    const gitterRoom = await troupeService.findById(gitterRoomId);
    assert(gitterRoom, `Gitter room not found (id=${gitterRoomId}`);
    const gitterBridgeUser = await userService.findByUsername(this._gitterBridgeUsername);
    assert(
      gitterBridgeUser,
      `Unable to find bridge user in Gitter database username=${this._gitterBridgeUsername}`
    );

    const intent = this.matrixBridge.getIntent();
    // TODO: Use room membership events instead of profile and cache things
    let profile = {};
    try {
      profile = await intent.getProfileInfo(event.sender);
    } catch (err) {
      // no-op, the user just won't get any info
    }

    // Strip the @ sigil off the front if it exists
    const externalId = event.sender.replace(/^@/, '');

    // Get the first part of the MXID to use as the displayName if one wasn't provided
    let displayName = profile.displayname;
    if (!profile.displayname) {
      const splitMxid = externalId.split(':');
      displayName = splitMxid[0];
    }

    const newChatMessage = await chatService.newChatMessageToTroupe(gitterRoom, gitterBridgeUser, {
      virtualUser: {
        type: 'matrix',
        externalId,
        displayName,
        avatarUrl: profile.avatar_url
          ? intent.getClient().mxcUrlToHttp(profile.avatar_url)
          : undefined
      },
      text: event.content.body
    });

    // Store the message so we can reference it in edits and threads/replies
    await store.storeBridgedMessage(newChatMessage._id, event.event_id);

    return null;
  }

  async handleChatMessageDeleteEvent(event) {
    // If someone is passing us mangled events, just ignore them.
    if (!validateEventForMessageDeleteEvent(event)) {
      return null;
    }

    const matrixEventId = event.redacts;
    const gitterMessageId = await store.getGitterMessageIdByMatrixEventId(matrixEventId);
    assert(
      gitterMessageId,
      `Unable to find bridged Gitter message in Gitter database matrixEventId=${matrixEventId} while trying to delete message`
    );

    const chatMessage = await chatService.findById(gitterMessageId);
    assert(
      chatMessage,
      `Gitter chatMessage(id=${gitterMessageId}) not found while trying to delete message`
    );

    const gitterRoom = await troupeService.findById(chatMessage.toTroupeId);
    assert(
      chatMessage,
      `Gitter room(id=${chatMessage.toTroupeId}) not found while trying to delete message`
    );

    await chatService.deleteMessageFromRoom(gitterRoom, chatMessage);

    return null;
  }
}

module.exports = MatrixEventHandler;
