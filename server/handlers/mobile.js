"use strict";

var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var userHomeRenderer = require('./renderers/userhome');
var chatRenderer = require('./renderers/chat');
var express = require('express');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/embedded-chat',
  identifyRoute('mobile-embedded-chat'),
  chatRenderer.renderMobileNativeEmbeddedChat);

router.get('/home',
  ensureLoggedIn,
  identifyRoute('mobile-home'),
  userHomeRenderer.renderMobileNativeUserhome);

module.exports = router;
