'use strict';

const debug = require('debug')('gitter:app:matrix-bridge:matrix-event-handler');
const assert = require('assert');
const chatService = require('gitter-web-chats');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const userService = require('gitter-web-users');
const store = require('./store');
const env = require('gitter-web-env');
const logger = env.logger;
const errorReporter = env.errorReporter;
const stats = env.stats;
const transformMatrixEventContentIntoGitterMessage = require('./transform-matrix-event-content-into-gitter-message');
const MatrixUtils = require('./matrix-utils');

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

// Because the Gitter community or room name can have underscores in it
// and we replace forward slashes with underscores in room aliases,
// it's ambiguous where we need to put the forward slash back in.
//
// This function will replace each spot where an underscore is with
// a forward slash and check if it exists on Gitter. If it exists, return that room.
async function findGitterRoomFromAliasLocalPart(aliasLocalpart) {
  // Find all the places where an underscore exists
  const underscoreIndexList = [];
  aliasLocalpart.replace(/_/g, (match, offset) => {
    underscoreIndexList.push(offset);
  });

  // Loop through each place where an underscore is, replace it with a forward slash,
  // and check if that room exists on Gitter
  for (const underscoreIndex of underscoreIndexList) {
    const uri = `${aliasLocalpart.substring(0, underscoreIndex)}/${aliasLocalpart.substring(
      underscoreIndex + 1,
      aliasLocalpart.length
    )}`;

    debug(`findGitterRoomFromAliasLocalPart() checking if uri=${uri} exists`);
    const gitterRoom = await troupeService.findByUri(uri);
    if (!gitterRoom) {
      continue;
    }

    debug(`findGitterRoomFromAliasLocalPart() found gitterRoom=${gitterRoom.uri}`);
    return gitterRoom;
  }
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
    this.matrixUtils = new MatrixUtils(matrixBridge);
  }

  async onAliasQuery(alias, aliasLocalpart) {
    debug('onAliasQuery', alias, aliasLocalpart);

    const gitterRoom = await findGitterRoomFromAliasLocalPart(aliasLocalpart);
    if (!gitterRoom) {
      return null;
    }

    const matrixRoomId = await this.matrixUtils.getOrCreateMatrixRoomByGitterRoomId(gitterRoom._id);

    return {
      roomId: matrixRoomId
    };
  }

  async onEventData(event) {
    try {
      debug('onEventData', event);
      stats.eventHF('matrix_bridge.event_received');
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
      logger.error(`Error while processing Matrix event: ${err}`, {
        exception: err
      });
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
      return null;
    }

    const matrixRoomId = event.room_id;
    const matrixEventId = event.content['m.relates_to'].event_id;
    const gitterMessageId = await store.getGitterMessageIdByMatrixEventId(
      matrixRoomId,
      matrixEventId
    );

    const chatMessage = await chatService.findById(gitterMessageId);
    const gitterRoom = await troupeService.findById(chatMessage.toTroupeId);
    const gitterBridgeUser = await userService.findByUsername(this._gitterBridgeUsername);

    stats.event('matrix_bridge.chat_edit', {
      gitterRoomId: chatMessage.toTroupeId,
      chatMessage: chatMessage.id || chatMessage._id,
      matrixRoomId,
      matrixEventId: matrixEventId
    });

    const newText = await transformMatrixEventContentIntoGitterMessage(
      event.content['m.new_content']
    );
    await chatService.updateChatMessage(gitterRoom, chatMessage, gitterBridgeUser, newText);

    return null;
  }

  async handleChatMessageCreateEvent(event) {
    // If someone is passing us mangled events, just ignore them.
    if (!validateEventForMessageCreateEvent(event)) {
      return null;
    }

    const matrixEventId = event.event_id;
    const matrixRoomId = event.room_id;

    const gitterRoomId = await store.getGitterRoomIdByMatrixRoomId(matrixRoomId);
    const gitterRoom = await troupeService.findById(gitterRoomId);
    const gitterBridgeUser = await userService.findByUsername(this._gitterBridgeUsername);

    stats.event('matrix_bridge.chat_create', {
      gitterRoomId,
      matrixRoomId,
      matrixEventId
    });

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

    // Handle replies from Matrix and translate into Gitter threaded conversations
    let parentId;
    if (
      event.content['m.relates_to'] &&
      event.content['m.relates_to']['m.in_reply_to'] &&
      event.content['m.relates_to']['m.in_reply_to'].event_id
    ) {
      const inReplyToGitterMessageId = await store.getGitterMessageIdByMatrixEventId(
        event.room_id,
        event.content['m.relates_to']['m.in_reply_to'].event_id
      );
      const chatMessage = await chatService.findById(inReplyToGitterMessageId);
      if (!chatMessage) {
        return null;
      }

      // If you replied to a message that is already in a thread, put the reply in the thread under the parent instead
      if (chatMessage.parentId) {
        parentId = chatMessage.parentId;
      }
      // Otherwise, you are already replying to a top-level message which is good in our book
      else {
        parentId = inReplyToGitterMessageId;
      }
    }

    const newText = await transformMatrixEventContentIntoGitterMessage(event.content);

    const newChatMessage = await chatService.newChatMessageToTroupe(gitterRoom, gitterBridgeUser, {
      parentId,
      virtualUser: {
        type: 'matrix',
        externalId,
        displayName,
        avatarUrl: profile.avatar_url
          ? intent.getClient().mxcUrlToHttp(profile.avatar_url)
          : undefined
      },
      text: newText
    });

    // Store the message so we can reference it in edits and threads/replies
    await store.storeBridgedMessage(newChatMessage, matrixRoomId, matrixEventId);

    return null;
  }

  async handleChatMessageDeleteEvent(event) {
    // If someone is passing us mangled events, just ignore them.
    if (!validateEventForMessageDeleteEvent(event)) {
      return null;
    }

    const matrixRoomId = event.room_id;
    const matrixEventId = event.redacts;
    const gitterMessageId = await store.getGitterMessageIdByMatrixEventId(
      matrixRoomId,
      matrixEventId
    );

    const chatMessage = await chatService.findById(gitterMessageId);
    const gitterRoom = await troupeService.findById(chatMessage.toTroupeId);

    stats.event('matrix_bridge.chat_delete', {
      gitterRoomId: chatMessage.toTroupeId,
      chatMessage: chatMessage.id || chatMessage._id,
      matrixRoomId,
      matrixEventId: matrixEventId
    });

    await chatService.deleteMessageFromRoom(gitterRoom, chatMessage);

    return null;
  }
}

module.exports = MatrixEventHandler;
