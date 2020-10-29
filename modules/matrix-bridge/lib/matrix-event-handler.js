'use strict';

const assert = require('assert');
const { ContentRepo } = require('matrix-appservice-bridge');
const chatService = require('gitter-web-chats');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const userService = require('gitter-web-users');
const store = require('./store');

class MatrixEventHandler {
  constructor(matrixBridge, gitterBridgeUsername) {
    assert(matrixBridge);
    assert(gitterBridgeUsername);
    this.matrixBridge = matrixBridge;
    this._gitterBridgeUsername = gitterBridgeUsername;
  }

  async onEvent(event) {
    if (event.type === 'm.room.message') {
      const gitterRoomId = await store.getGitterRoomIdByMatrixRoomId(event.room_id);
      assert(gitterRoomId);
      const gitterRoom = await troupeService.findById(gitterRoomId);
      assert(gitterRoom);
      const gitterBridgeUser = await userService.findByUsername(this._gitterBridgeUsername);
      assert(gitterBridgeUser);

      const intent = this.matrixBridge.getIntent();
      // TODO: Use room membership events instead of profile
      const profile = await intent.getProfileInfo(event.sender);

      await chatService.newChatMessageToTroupe(gitterRoom, gitterBridgeUser, {
        virtualUser: {
          type: 'matrix',
          externalId: event.sender.replace(/^@/, ''),
          displayName: profile.displayname,
          avatarUrl: intent.getClient().mxcUrlToHttp(profile.avatar_url)
        },
        text: event.content.body
      });

      return;
    }
  }
}

module.exports = MatrixEventHandler;
