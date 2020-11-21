'use strict';

// Some reference: https://github.com/matrix-org/matrix-bifrost/blob/develop/src/store/Store.ts

const persistence = require('gitter-web-persistence');

async function getGitterRoomIdByMatrixRoomId(matrixRoomId) {
  const bridgedRoomEntry = await persistence.MatrixBridgedRoom.findOne({
    matrixRoomId
  });

  if (bridgedRoomEntry) {
    return bridgedRoomEntry.troupeId;
  }
}

async function getMatrixRoomIdByGitterRoomId(gitterRoomId) {
  const bridgedRoomEntry = await persistence.MatrixBridgedRoom.findOne({
    troupeId: gitterRoomId
  }).exec();

  if (bridgedRoomEntry) {
    return bridgedRoomEntry.matrixRoomId;
  }
}

async function getMatrixUserIdByGitterUserId(gitterUserId) {
  const bridgedUserEntry = await persistence.MatrixBridgedUser.findOne({
    userId: gitterUserId
  }).exec();
  if (bridgedUserEntry) {
    return bridgedUserEntry.matrixId;
  }
}

async function getMatrixEventIdByGitterMessageId(gitterMessageId) {
  const bridgedMessageEntry = await persistence.MatrixBridgedChatMessage.findOne({
    gitterMessageId
  }).exec();
  if (bridgedMessageEntry) {
    return bridgedMessageEntry.matrixEventId;
  }
}

async function getGitterMessageIdByMatrixEventId(matrixEventId) {
  const bridgedMessageEntry = await persistence.MatrixBridgedChatMessage.findOne({
    matrixEventId
  }).exec();
  if (bridgedMessageEntry) {
    return bridgedMessageEntry.gitterMessageId;
  }
}

async function storeBridgedRoom(gitterRoomId, matrixRoomId) {
  return persistence.MatrixBridgedRoom.create({
    troupeId: gitterRoomId,
    matrixRoomId: matrixRoomId
  });
}

async function storeBridgedUser(gitterUserId, matrixId) {
  return persistence.MatrixBridgedUser.create({
    userId: gitterUserId,
    matrixId
  });
}

async function storeBridgedMessage(gitterMessageId, matrixEventId) {
  return persistence.MatrixBridgedChatMessage.create({
    gitterMessageId,
    matrixEventId
  });
}

module.exports = {
  // Rooms
  getGitterRoomIdByMatrixRoomId,
  getMatrixRoomIdByGitterRoomId,
  storeBridgedRoom,

  // Users
  getMatrixUserIdByGitterUserId,
  storeBridgedUser,

  // Messages
  getGitterMessageIdByMatrixEventId,
  getMatrixEventIdByGitterMessageId,
  storeBridgedMessage
};
