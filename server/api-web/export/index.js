'use strict';

const express = require('express');
const cors = require('cors');
const resourceRoute = require('../../web/resource-route-generator');
const restSerializer = require('../../serializers/rest-serializer');

const generateExportResource = require('./generate-export-resource');
const ForumWithPolicyService = require('../../services/forum-with-policy-service');

const apiForumResource = require('../../api/v1/forums');

// API uses CORS
const corsOptions = {
  origin: true,
  methods: ['GET'],
  //maxAge: 600, // 10 minutes
  allowedHeaders: [
    'content-type',
    'x-access-token',
    'authorization',
    'accept'
  ],
  exposedHeaders: [
    // Rate limiting with dolph
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
};

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.use(cors(corsOptions));



const forumsResource = {
  id: 'forum',
  load: apiForumResource.load,
  subresources: {
    'topics.ndjson': generateExportResource(
      'topics',
      (req) => {
        const forumWithPolicyService = new ForumWithPolicyService(req.forum, req.user, req.userForumPolicy);
        return forumWithPolicyService.getTopicCursor();
      },
      (req) => {
        const strategy = restSerializer.TopicStrategy.nested({
          currentUserId: req.user && req.user._id
        });

        return strategy;
      }
    )
  }
};

router.use('/forums', resourceRoute('api-forums', forumsResource));


module.exports = router;
