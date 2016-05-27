"use strict";

var express = require('express');
var urlJoin = require('url-join');
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var appMiddleware = require('./app/middleware');
var timezoneMiddleware = require('../web/middlewares/timezone');
var appRenderUserHome = require('./app/render/userhome');
var appRenderMainFrame = require('./app/render/main-frame');
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
      appRenderUserHome.renderMobileUserHome(req, res, next, 'home');
    } else {
      appRenderMainFrame.renderMainFrame(req, res, next, 'home');
    }
  });


router.get('/~home',
  identifyRoute('home-frame'),
  ensureLoggedIn,
  featureToggles,
  appMiddleware.isPhoneMiddleware,
  function(req, res, next) {
    appRenderUserHome.renderHomePage(req, res, next);
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
  ensureLoggedIn,
  featureToggles,
  appMiddleware.isPhoneMiddleware,
  function (req, res, next) {
    req.uriContext = {
      uri: 'home'
    };

    var frameUrl = urlJoin('explore', (req.params[0] || ''));

    appRenderMainFrame.renderMainFrame(req, res, next, frameUrl);
  });

router.get('/learn',
  identifyRoute('home-learn-main'),
  ensureLoggedIn,
  featureToggles,
  function (req, res, next) {
    req.uriContext = {
      uri: 'learn'
    };

    appRenderMainFrame.renderMainFrame(req, res, next, 'learn');
  });

module.exports = router;
