'use strict';

const { iterableFromMongooseCursor } = require('gitter-web-persistence-utils/lib/mongoose-utils');
const StatusError = require('statuserror');
const restSerializer = require('../../serializers/rest-serializer');
const policyFactory = require('gitter-web-permissions/lib/policy-factory');

const generateExportResource = require('./generate-export-resource');
const chatService = require('gitter-web-chats');

const apiRoomResource = require('../../api/v1/rooms');

const roomResource = {
  id: 'troupeId',
  load: async (...args) => {
    await apiRoomResource.load(...args);

    const [req, id] = args;
    const policy = await policyFactory.createPolicyForRoomId(req.user, id);
    const access = await policy.canAdmin();

    if (access) {
      return id;
    } else {
      const userId = req.user && req.user._id;
      throw new StatusError(userId ? 403 : 401);
    }
  },
  subresources: {
    'messages.ndjson': generateExportResource('room-messages', {
      getIterable: async req => {
        return iterableFromMongooseCursor(chatService.getCursorByRoomId(req.params.troupeId));
      },
      getStrategy: () => {
        return new restSerializer.ChatStrategy({
          serializeFromUserId: false
        });
      }
    })
  }
};

module.exports = roomResource;
