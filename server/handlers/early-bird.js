"use strict";

var express = require('express');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var earlyBirdRenderer = require('./renderers/early-bird');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/',
  identifyRoute('earlybird'),
  earlyBirdRenderer.renderEarlyBirdPage
);

module.exports = router;
