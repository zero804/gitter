'use strict';

const express = require('express');
const cors = require('cors');
const resourceRoute = require('../../web/resource-route-generator');
const restSerializer = require('../../serializers/rest-serializer');
const persistence = require('gitter-web-persistence');
const mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');

const generateExportResource = require('./generate-export-resource');
const chatService = require('gitter-web-chats');

const apiUserResource = require('../../api/v1/user');

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
    'me.ndjson': generateExportResource(
      'user-data',
      req => {
        return persistence.User.find({
          _id: req.user.id
        })
          .lean()
          .read(mongoReadPrefs.secondaryPreferred)
          .cursor();
      },
      () => {
        return new restSerializer.UserStrategy();
      }
    ),
    'messages.ndjson': generateExportResource(
      'user-messages',
      req => {
        return chatService.getCursorByUserId(req.user.id);
      },
      req => {
        // Serialize the user once and re-use it for all of the users' messages
        const userStrategy = new restSerializer.UserStrategy();
        const serializedUser = restSerializer.serializeObject(req.user, userStrategy);

        return new restSerializer.ChatStrategy({
          user: serializedUser
        });
      }
    )
  }
};

router.use('/user', resourceRoute('api-export-user', userResource));

module.exports = router;
