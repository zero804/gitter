"use strict";

var express = require('express');
var urlJoin = require('url-join');
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var appMiddleware = require('./app/middleware');
var timezoneMiddleware = require('../web/middlewares/timezone');
var appRender = require('./app/render');
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
      appRender.renderMobileUserHome(req, res, next, 'home');
    } else {
      appRender.renderMainFrame(req, res, next, 'home');
    }
  });


router.get('/~home',
  identifyRoute('home-frame'),
  ensureLoggedIn,
  featureToggles,
  appMiddleware.isPhoneMiddleware,
  function(req, res, next) {
    appRender.renderHomePage(req, res, next);
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

    appRender.renderMainFrame(req, res, next, frameUrl);
  });

router.get('/learn',
  identifyRoute('home-learn-main'),
  ensureLoggedIn,
  featureToggles,
  function (req, res, next) {
    req.uriContext = {
      uri: 'learn'
    };

    appRender.renderMainFrame(req, res, next, 'learn');
  });

module.exports = router;
