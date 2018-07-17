"use strict";

var express = require('express');
var authMiddleware = require('../web/middlewares/ensure-logged-in-or-get');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
const env = require('gitter-web-env');
const redisClient = env.redis.getClient();
const dolph = require('dolph');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/private/ping',
  authMiddleware,
  identifyRoute('ping'),
  require('./private/ping'));

// Borrow the health check routes from /api/
router.get('/private/health_check',
  identifyRoute('api-web-health-check'),
  require('../api/private/health-check'));

router.get('/private/health_check/full',
  identifyRoute('api-web-health-check-full'),
  require('../api/private/health-check-full'));

router.use('/features', require('./features'));

// This is in /api_web because we want sessions/cookies to be acceptable authentication
// so you can click a link within the app
router.use('/export', [
  ensureLoggedIn,
  dolph({
    prefix: 'export:',
    redisClient: redisClient,
    limit: process.env.TEST_EXPORT_RATE_LIMIT || 1,
    // 1 hours in seconds
    expiry: 1 * (60 * 60),
    keyFunction: function(req) {
      if (req.user) {
        if (req.authInfo && req.authInfo.client) {
          return req.user.id + ':' + req.authInfo.client.id;
        }

        return req.user.id;
      }

      // Anonymous access tokens
      if (req.authInfo && req.authInfo.accessToken) {
        return req.authInfo.accessToken;
      }

      // Should never get here
      return 'anonymous';
    },
  }),
  require('./export')
]);

module.exports = router;
