"use strict";

var express            = require('express');
var ensureLoggedIn     = require('../web/middlewares/ensure-logged-in');
var appMiddleware      = require('./app/middleware');
var timezoneMiddleware = require('../web/middlewares/timezone');
var appRender          = require('./app/render');
var identifyRoute      = require('gitter-web-env').middlewares.identifyRoute;

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/',
  identifyRoute('home-main'),
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
  ensureLoggedIn,
  identifyRoute('home-frame'),
  appMiddleware.isPhoneMiddleware,
  function(req, res, next) {
    appRender.renderHomePage(req, res, next);
  });


// This is used from the explore page
router.get('/createroom',
  ensureLoggedIn,
  identifyRoute('create-room-redirect'),
  function (req, res) {
    res.redirect('/home#createroom');
  });

router.get('/explore',
  ensureLoggedIn,
  identifyRoute('home-explore'),
  function (req, res, next) {
    req.uriContext = {
      uri: 'home'
    };

    appRender.renderMainFrame(req, res, next, 'explore');
  });

router.get('/learn',
  ensureLoggedIn,
  identifyRoute('home-learn-main'),
  function (req, res, next) {
    req.uriContext = {
      uri: 'learn'
    };

    appRender.renderMainFrame(req, res, next, 'learn');
  });

module.exports = router;
