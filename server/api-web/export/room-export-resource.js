'use strict';

const { iterableFromMongooseCursor } = require('gitter-web-persistence-utils/lib/mongoose-utils');
const StatusError = require('statuserror');
const restSerializer = require('../../serializers/rest-serializer');
const policyFactory = require('gitter-web-permissions/lib/policy-factory');

const generateExportResource = require('./generate-export-resource');
const chatService = require('gitter-web-chats');
const roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
const eventService = require('gitter-web-events');
const loadTroupeFromParam = require('../../api/v1/rooms/load-troupe-param');

const apiRoomResource = require('../../api/v1/rooms');

async function* transformIterable(iterable, transformFunc) {
  for await (let item of iterable) {
    yield await transformFunc(item);
  }
}

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
    }),
    'users.ndjson': generateExportResource('room-users', {
      getIterable: async req => {
        return transformIterable(
          iterableFromMongooseCursor(roomMembershipService.getCursorByRoomId(req.params.troupeId)),
          item => {
            return item.userId;
          }
        );
      },
      getStrategy: () => {
        return new restSerializer.UserIdStrategy();
      }
    }),
    'integration-events.ndjson': generateExportResource('room-integration-events', {
      getIterable: async req => {
        return iterableFromMongooseCursor(eventService.getCursorByRoomId(req.params.troupeId));
      },
      getStrategy: () => {
        return new restSerializer.EventStrategy();
      }
    }),
    'bans.ndjson': generateExportResource('room-bans', {
      getIterable: async req => {
        const room = await loadTroupeFromParam(req);
        return room.bans || [];
      },
      getStrategy: () => {
        return new restSerializer.TroupeBanStrategy();
      }
    })
  }
};

module.exports = roomResource;
