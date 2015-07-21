"use strict";

var express = require('express');
var authMiddleware = require('./web/middlewares/ensure-logged-in-or-get');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/private/ping', authMiddleware, require('./ping'));

// Borrow the health check routes from /api/
router.get('/private/health_check', require('../api/private/health-check'));
router.get('/private/health_check/full', require('../api/private/health-check-full'));

module.exports = router;
