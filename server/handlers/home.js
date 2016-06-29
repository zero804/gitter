"use strict";

var express = require('express');
var urlJoin = require('url-join');
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var appMiddleware = require('./app/middleware');
var timezoneMiddleware = require('../web/middlewares/timezone');
var userHomeRenderer = require('./renderers/userhome');
var mainFrameRenderer = require('./renderers/main-frame');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var featureToggles = require('../web/middlewares/feature-toggles');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/',
  identifyRoute('home-main'),
  featureToggles,
  appMiddleware.isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    req.uriContext = {
      uri: 'home'
    };

    if (req.isPhone) {
      userHomeRenderer.renderMobileUserHome(req, res, next, 'home');
    } else {
      mainFrameRenderer.renderMainFrame(req, res, next, 'home');
    }
  });


router.get('/~home',
  identifyRoute('home-frame'),
  ensureLoggedIn,
  featureToggles,
  appMiddleware.isPhoneMiddleware,
  function(req, res, next) {
    userHomeRenderer.renderHomePage(req, res, next);
  });


// Used for the create button on `/home`
router.get('/createroom',
  identifyRoute('create-room-redirect'),
  ensureLoggedIn,
  featureToggles,
  function (req, res) {
    res.redirect('/home#createroom');
  });

router.get(new RegExp('/explore(.*)?'),
  identifyRoute('home-explore'),
  featureToggles,
  appMiddleware.isPhoneMiddleware,
  function (req, res, next) {
    if(!req.user) {
      return res.redirect('/explore');
    }

    req.uriContext = {
      uri: 'home'
    };

    var frameUrl = urlJoin('explore', (req.params[0] || ''));

    mainFrameRenderer.renderMainFrame(req, res, next, frameUrl);
  });

router.get('/learn',
  identifyRoute('home-learn-main'),
  ensureLoggedIn,
  featureToggles,
  function (req, res, next) {
    req.uriContext = {
      uri: 'learn'
    };

    mainFrameRenderer.renderMainFrame(req, res, next, 'learn');
  });

module.exports = router;
