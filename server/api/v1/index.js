"use strict";

var express = require('express');
var resourceRoute = require('../../web/resource-route-generator');
var authMiddleware = require('../../web/middlewares/auth-api');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

var router = express.Router({ caseSensitive: true, mergeParams: true });

var usersResources = resourceRoute(require('./user'));
var roomResources = resourceRoute(require('./rooms'));

usersResources.use('/', authMiddleware);
roomResources.use('/', authMiddleware);

router.use('/user', usersResources);
router.use('/rooms', roomResources);

// APN has no auth requirement as user may not have authenticated
// and this is used for devices without users
router.post('/apn',
  identifyRoute('apn-registration'),
  require('./apn.js'));

// userapn ties together devices from /v1/apn and actual users.
// this definitely requires auth
router.post('/userapn',
  authMiddleware,
  identifyRoute('user-apn-registration'),
  require('./userapn.js'));

router.post('/eyeballs',
  authMiddleware,
  identifyRoute('eyeballs'),
  require('./eyeballs.js'));

router.delete('/sockets/:socketId',
  identifyRoute('remove-socket'),
  require('./sockets.js'));

router.get('/repo-info',
  authMiddleware,
  identifyRoute('repo-info'),
  require('./repo-info.js'));

router.get('/channel-search',
  authMiddleware,
  identifyRoute('channel-search'),
  require('./channel-search.js'));

// Deprecated - remove by 15 November
router.get('/public-repo-search',
  authMiddleware,
  identifyRoute('public-repo-search'),
  require('./public-repo-search.js'));

router.post('/private/gcm',
  authMiddleware,
  identifyRoute('gcm-registration'),
  require('./private/gcm'));

module.exports = router;
