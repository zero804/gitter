'use strict';

// TODO: Remove this file after [vue-left-menu] ships

var express = require('express');

var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var featureToggles = require('../web/middlewares/feature-toggles');
var isPhoneMiddleware = require('../web/middlewares/is-phone');
var exploreRenderer = require('./renderers/explore-renderer');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get(
  '/:tags?',
  identifyRoute('explore-tags-redirect'),
  featureToggles,
  exploreRenderer.exploreTagRedirector
);

router.get(
  '/tags/:tags',
  identifyRoute('explore-tags'),
  featureToggles,
  isPhoneMiddleware,
  exploreRenderer.renderExplorePage
);

module.exports = router;
