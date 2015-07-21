"use strict";

var express = require('express');
var resourceRoute = require('../../web/resource-route-generator');
var authMiddleware = require('../../web/middlewares/auth-api');

var router = express.Router({ caseSensitive: true, mergeParams: true });

var usersResources = resourceRoute(require('./user'));
var roomResources = resourceRoute(require('./rooms'));

usersResources.use('/', authMiddleware);
roomResources.use('/', authMiddleware);

router.use('/user', usersResources);
router.use('/rooms', roomResources);

// Misc stuff

// APN has no auth requirement as user may not have authenticated
// and this is used for devices without users
router.post('/apn', require('./apn.js'));

// userapn ties together devices from /v1/apn and actual users.
// this definitely requires auth
router.post('/userapn', authMiddleware, require('./userapn.js'));

router.post('/eyeballs', authMiddleware, require('./eyeballs.js'));

router.delete('/sockets/:socketId', require('./sockets.js'));

router.get('/repo-info', authMiddleware, require('./repo-info.js'));

router.get('/channel-search', authMiddleware, require('./channel-search.js'));

// Deprecated - remove by 15 November
router.get('/public-repo-search', authMiddleware, require('./public-repo-search.js'));

router.post('/private/gcm', authMiddleware, require('./private/gcm'));

module.exports = router;
