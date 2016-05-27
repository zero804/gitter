"use strict";

var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var renderUserHome = require('./app/render/userhome');
var renderChat = require('./app/render/chat');
var express = require('express');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/embedded-chat',
  identifyRoute('mobile-embedded-chat'),
  renderChat.renderMobileNativeEmbeddedChat);

router.get('/home',
  ensureLoggedIn,
  identifyRoute('mobile-home'),
  renderUserHome.renderMobileNativeUserhome);

module.exports = router;
