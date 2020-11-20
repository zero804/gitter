'use strict';

const assert = require('assert');
const chatService = require('gitter-web-chats');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const userService = require('gitter-web-users');
const store = require('./store');

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
    if (event.type === 'm.room.message') {
      return this.handleChatMessageCreateEvent(event);
    }
  }

  async handleChatMessageCreateEvent(event) {
    // If someone is passing us mangled events, just ignore them.
    if (event.state_key || !event.sender || !event.content || !event.content.body) {
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

    await chatService.newChatMessageToTroupe(gitterRoom, gitterBridgeUser, {
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

    return;
  }
}

module.exports = MatrixEventHandler;
