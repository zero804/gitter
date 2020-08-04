'use strict';

const express = require('express');
const cors = require('cors');
const resourceRoute = require('../../web/resource-route-generator');
const restSerializer = require('../../serializers/rest-serializer');
const LastTroupeAccessTimesForUserStrategy = require('../../serializers/rest/troupes/last-access-times-for-user-strategy');

const generateExportResource = require('./generate-export-resource');
const identityService = require('gitter-web-identity');
const chatService = require('gitter-web-chats');
const userSettingsService = require('gitter-web-user-settings');
const groupMembershipService = require('gitter-web-groups/lib/group-membership-service');
const groupFavouritesCore = require('gitter-web-groups/lib/group-favourites-core');
const roomFavouritesCore = require('gitter-web-rooms/lib/room-favourites-core');
const roomMembershipService = require('gitter-web-rooms/lib/room-membership-service');
const recentRoomCore = require('gitter-web-rooms/lib/recent-room-core');

const apiUserResource = require('../../api/v1/user');

async function* iterableFromMongooseCursor(cursor) {
  let doc = await cursor.next();
  do {
    yield doc;
    doc = await cursor.next();
  } while (doc !== null);
}

// API uses CORS
const corsOptions = {
  origin: true,
  methods: ['GET'],
  //maxAge: 600, // 10 minutes
  allowedHeaders: ['content-type', 'x-access-token', 'authorization', 'accept'],
  exposedHeaders: [
    // Rate limiting with dolph
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
};

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.use(cors(corsOptions));

const userResource = {
  id: 'user',
  load: apiUserResource.load,
  subresources: {
    'me.ndjson': generateExportResource('user-data', {
      getIterable: req => {
        return [req.user];
      },
      getStrategy: () => {
        return new restSerializer.UserStrategy();
      }
    }),
    'user-settings.ndjson': generateExportResource('user-settings', {
      getIterable: req => {
        return iterableFromMongooseCursor(userSettingsService.getCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new restSerializer.PassthroughStrategy();
      }
    }),
    'identities.ndjson': generateExportResource('user-identites', {
      getIterable: req => {
        return iterableFromMongooseCursor(identityService.getCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new restSerializer.UserStrategy();
      }
    }),
    'group-favourites.ndjson': generateExportResource('user-group-favourites', {
      getIterable: req => {
        return iterableFromMongooseCursor(groupFavouritesCore.getCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new restSerializer.PassthroughStrategy();
      }
    }),
    'admin-groups.ndjson': generateExportResource('admin-groups', {
      getIterable: req => {
        return groupMembershipService.findAdminGroupsForUser(req.user);
      },
      getStrategy: req => {
        return new restSerializer.GroupStrategy({
          currentUserId: req.user.id,
          currentUser: req.user
        });
      }
    }),
    'room-favourites.ndjson': generateExportResource('user-room-favourites', {
      getIterable: req => {
        return iterableFromMongooseCursor(roomFavouritesCore.getCursorByUserId(req.user.id));
      },
      getStrategy: () => {
        return new restSerializer.PassthroughStrategy();
      }
    }),
    'rooms.ndjson': generateExportResource('rooms', {
      getIterable: req => {
        return roomMembershipService.findRoomIdsForUser(req.user.id);
      },
      getStrategy: req => {
        return new restSerializer.TroupeIdStrategy({
          currentUserId: req.user.id,
          currentUser: req.user,
          skipUnreadCounts: true,
          includePremium: false
        });
      }
    }),
    'room-last-access-times.ndjson': generateExportResource('user-room-last-access-times', {
      getIterable: async req => {
        return Object.keys(
          await recentRoomCore.getTroupeLastAccessTimesForUserExcludingHidden(req.user.id)
        );
      },
      getStrategy: req => {
        return new LastTroupeAccessTimesForUserStrategy({
          currentUserId: req.user.id
        });
      }
    }),
    'messages.ndjson': generateExportResource('user-messages', {
      getIterable: async req => {
        return iterableFromMongooseCursor(chatService.getCursorByUserId(req.user.id));
      },
      getStrategy: req => {
        // Serialize the user once and re-use it for all of the users' messages
        const userStrategy = new restSerializer.UserStrategy();
        const serializedUser = restSerializer.serializeObject(req.user, userStrategy);

        return new restSerializer.ChatStrategy({
          user: serializedUser
        });
      }
    })
  }
};

router.use('/user', resourceRoute('api-export-user', userResource));

module.exports = router;
