"use strict";

var express        = require('express');
var authMiddleware = require('../web/middlewares/ensure-logged-in-or-get');
var identifyRoute  = require('gitter-web-env').middlewares.identifyRoute;
var featureToggles = require('../web/middlewares/feature-toggles');
var fflip          = require('fflip');

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

router.get('/features/:name/:action',
  featureToggles,
  fflip.express_route);
  
router.post('/features/:name/:action',
  featureToggles,
  fflip.express_route);

router.get('/features/',
  featureToggles,
  require('./feature-list'));

module.exports = router;
