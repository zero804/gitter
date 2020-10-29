'use strict';

const request = require('request');
const path = require('path');
const troupeService = require('gitter-web-rooms/lib/troupe-service');
const userService = require('gitter-web-users');
const avatars = require('gitter-web-avatars');
const env = require('gitter-web-env');
const config = env.config;
const logger = env.logger;

const store = require('./store');

const serverName = config.get('matrix:bridge:serverName');

/**
 * downloadFile - This function will take a URL and store the resulting data into
 * a buffer.
 */
const HTTP_OK = 200;
async function downloadFileToBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = request(url);

    // TODO: Implement maxSize to reject, req.abort()
    let buffer = Buffer.alloc(0);
    req.on('data', d => {
      buffer = Buffer.concat([buffer, d]);
    });

    req.on('response', res => {
      if (res.statusCode !== HTTP_OK) {
        reject(`Non 200 status code (${res.statusCode})`);
      }

      req.on('end', () => {
        resolve({
          buffer,
          mimeType: res.headers['content-type']
        });
      });
    });

    req.on('error', err => {
      reject(`Failed to download. ${err}`);
    });
  });
}

class MatrixUtils {
  constructor(matrixBridge) {
    this.matrixBridge = matrixBridge;
  }

  async getOrCreateMatrixRoomByGitterRoomId(gitterRoomId) {
    const existingMatrixRoomId = await store.getMatrixRoomIdByGitterRoomId(gitterRoomId);
    if (existingMatrixRoomId) {
      return existingMatrixRoomId;
    }

    // Create the Matrix room if it doesn't already exist
    const room = await troupeService.findById(gitterRoomId);

    logger.info(
      `Existing Matrix room not found, creating new Matrix room for room.uri=${room.uri} roomId=${gitterRoomId}`
    );

    const bridgeIntent = this.matrixBridge.getIntent();
    const newRoom = await bridgeIntent.createRoom({
      createAsClient: true,
      options: {
        name: `${room.uri}`,
        //invite: recipients,
        visibility: 'public',
        room_alias: gitterRoomId,
        preset: 'public_chat'
        //initial_state: extraContent
      }
    });

    await store.storeBridgedRoom(gitterRoomId, newRoom.room_id);

    return newRoom.room_id;
  }

  async getOrCreateMatrixUserByGitterUserId(gitterUserId) {
    const existingMatrixUserId = await store.getMatrixUserIdByGitterUserId(gitterUserId);
    if (existingMatrixUserId) {
      return existingMatrixUserId;
    }

    const gitterUser = await userService.findById(gitterUserId);

    const mxid = `@${gitterUser.username}-${gitterUser.id}:${serverName}`;

    const intent = this.matrixBridge.getIntent(mxid);
    await intent.setDisplayName(`${gitterUser.username} (${gitterUser.displayName})`);
    // TODO: do MXC URL stuff
    const gitterAvatarUrl = avatars.getForUser(gitterUser);

    const data = await downloadFileToBuffer(gitterAvatarUrl);
    const mxcUrl = await intent.uploadContent(data.buffer, {
      onlyContentUri: true,
      rawResponse: false,
      name: path.basename(gitterAvatarUrl),
      type: data.mimeType
    });
    await intent.setAvatarUrl(mxcUrl);

    await store.storeBridgedUser(gitterUser.id, mxid);

    return mxid;
  }
}

module.exports = MatrixUtils;
