'use strict';

var express = require('express');
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
const featureToggles = require('../web/middlewares/feature-toggles');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
const learnRenderer = require('./renderers/learn-renderer');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get(
  '/~learn',
  ensureLoggedIn,
  featureToggles,
  identifyRoute('learn-frame'),
  learnRenderer.renderLearnPage
);

module.exports = router;
