"use strict";

var express = require('express');
var urlJoin = require('url-join');
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var timezoneMiddleware = require('../web/middlewares/timezone');
var isPhoneMiddleware = require('../web/middlewares/is-phone');
var featureToggles = require('../web/middlewares/feature-toggles');
var generateStaticUriContextMiddleware = require('./uri-context/generate-static-uri-context-middleware');
var userHomeRenderer = require('./renderers/userhome');
var mainFrameRenderer = require('./renderers/main-frame');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

var router = express.Router({ caseSensitive: true, mergeParams: true });

var homeUriContextMiddleware = generateStaticUriContextMiddleware('home');

router.get('/',
  identifyRoute('home-main'),
  featureToggles,
  homeUriContextMiddleware,
  isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    if (req.isPhone) {
      userHomeRenderer.renderMobileUserHome(req, res, next, 'home');
    } else {
      mainFrameRenderer.renderMainFrame(req, res, next, {
        subFrameLocation: '/home/~home',
        title: 'Home'
      });
    }
  });


router.get('/~home',
  identifyRoute('home-frame'),
  ensureLoggedIn,
  featureToggles,
  homeUriContextMiddleware,
  isPhoneMiddleware,
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
  homeUriContextMiddleware,
  isPhoneMiddleware,
  function (req, res, next) {
    if(!req.user) {
      return res.redirect('/explore');
    }

    var exploreParam = req.params[0] || '';
    var subFrameLocation = urlJoin('/home/~explore', exploreParam);

    mainFrameRenderer.renderMainFrame(req, res, next, {
      subFrameLocation: subFrameLocation,
      title: 'Explore ' + exploreParam.split('/').join(', ')
    });
  });

router.get('/learn',
  identifyRoute('home-learn-main'),
  ensureLoggedIn,
  featureToggles,
  homeUriContextMiddleware,
  function (req, res, next) {
    mainFrameRenderer.renderMainFrame(req, res, next, {
      subFrameLocation: '/learn/~learn',
      title: 'Learn'
    });
  });

module.exports = router;
