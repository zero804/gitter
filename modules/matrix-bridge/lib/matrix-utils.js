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
// Based on https://github.com/Half-Shot/matrix-appservice-discord/blob/7fc714d36943e2591a828a8a6481db37119c3bdc/src/util.ts#L65-L96
const HTTP_OK = 200;
async function downloadFileToBuffer(url) {
  return new Promise((resolve, reject) => {
    // Using `request` here to follow any redirects
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
    const gitterRoom = await troupeService.findById(gitterRoomId);

    logger.info(
      `Existing Matrix room not found, creating new Matrix room for room.uri=${gitterRoom.uri} roomId=${gitterRoomId}`
    );

    const roomAlias = gitterRoom.uri.replace('/', '_');

    const bridgeIntent = this.matrixBridge.getIntent();
    const newRoom = await bridgeIntent.createRoom({
      createAsClient: true,
      options: {
        name: gitterRoom.uri,
        topic: gitterRoom.topic,
        //invite: recipients,
        visibility: 'public',
        room_alias_name: roomAlias,
        preset: 'public_chat'
        //initial_state: extraContent
      }
    });
    // Store the bridged room right away!
    // If we created a bridged room, we want to make sure we store it 100% of the time
    logger.info(
      `Storing bridged room (Gitter room id=${gitterRoomId} -> Matrix room_id=${newRoom.room_id})`
    );
    await store.storeBridgedRoom(gitterRoomId, newRoom.room_id);

    // Add another alias for the room ID
    await bridgeIntent.createAlias(`#${gitterRoomId}:${serverName}`, newRoom.room_id);

    // Add a lowercase alias if necessary
    if (roomAlias.toLowerCase() !== roomAlias) {
      await bridgeIntent.createAlias(`#${roomAlias.toLowerCase()}:${serverName}`, newRoom.room_id);
    }

    const gitterAvatarUrl = avatars.getForGroupId(gitterRoom.groupId);
    try {
      if (gitterAvatarUrl) {
        const data = await downloadFileToBuffer(gitterAvatarUrl);
        const mxcUrl = await bridgeIntent.uploadContent(data.buffer, {
          onlyContentUri: true,
          rawResponse: false,
          name: path.basename(gitterAvatarUrl),
          type: data.mimeType
        });
        await bridgeIntent.setRoomAvatar(newRoom.room_id, mxcUrl);
      }
    } catch (err) {
      // Just log an error and noop if the user avatar fails to download.
      // It's more important that we just send their message without the avatar.
      logger.error(
        `Failed to download avatar for Gitter group(room.groupId=${gitterRoom.groupId}, gitterAvatarUrl=${gitterAvatarUrl}) which we were going to use for the bridged Matrix room`,
        {
          exception: err
        }
      );
    }

    return newRoom.room_id;
  }

  async getOrCreateMatrixUserByGitterUserId(gitterUserId) {
    const existingMatrixUserId = await store.getMatrixUserIdByGitterUserId(gitterUserId);
    if (existingMatrixUserId) {
      return existingMatrixUserId;
    }

    const gitterUser = await userService.findById(gitterUserId);

    const mxid = `@${gitterUser.username.toLowerCase()}-${gitterUser.id}:${serverName}`;

    const intent = this.matrixBridge.getIntent(mxid);
    await intent.setDisplayName(`${gitterUser.username} (${gitterUser.displayName})`);

    const gitterAvatarUrl = avatars.getForUser(gitterUser);
    try {
      if (gitterAvatarUrl) {
        const data = await downloadFileToBuffer(gitterAvatarUrl);
        const mxcUrl = await intent.uploadContent(data.buffer, {
          onlyContentUri: true,
          rawResponse: false,
          name: path.basename(gitterAvatarUrl),
          type: data.mimeType
        });
        await intent.setAvatarUrl(mxcUrl);
      }
    } catch (err) {
      // Just log an error and noop if the user avatar fails to download.
      // It's more important that we just send their message without the avatar.
      logger.error(
        `Failed to download avatar from Gitter user(gitterUserId=${gitterUserId}, gitterAvatarUrl=${gitterAvatarUrl}) which we were going to use for their bridged Matrix user`,
        {
          exception: err
        }
      );
    }

    logger.info(`Storing bridged user (Gitter user id=${gitterUser.id} -> Matrix mxid=${mxid})`);
    await store.storeBridgedUser(gitterUser.id, mxid);

    return mxid;
  }
}

module.exports = MatrixUtils;
