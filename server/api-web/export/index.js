'use strict';

const express = require('express');
const cors = require('cors');
const resourceRoute = require('../../web/resource-route-generator');
const restSerializer = require('../../serializers/rest-serializer');

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
    'messages.ndjson': generateExportResource(
      'user-messages',
      req => {
        return chatService.getCursorByUserId(req.user.id);
      },
      () => {
        return new restSerializer.ChatStrategy();
      }
    )
  }
};

router.use('/user', resourceRoute('api-export-user', userResource));

module.exports = router;
