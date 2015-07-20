"use strict";

var express = require('express');
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var appMiddleware      = require('./app/middleware');
var timezoneMiddleware = require('../web/middlewares/timezone');
var appRender          = require('./app/render');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/',
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


router.get('/~home', ensureLoggedIn, appMiddleware.isPhoneMiddleware,
  function(req, res, next) {
    appRender.renderHomePage(req, res, next);
  });


// This is used from the explore page
router.get('/createroom', ensureLoggedIn, function (req, res) {
  res.redirect('/home#createroom');
});

router.get('/explore', ensureLoggedIn, function (req, res, next) {
  req.uriContext = {
    uri: 'home'
  };

  appRender.renderMainFrame(req, res, next, 'explore');
});

router.get('/learn', ensureLoggedIn, function (req, res, next) {
  req.uriContext = {
    uri: 'learn'
  };

  appRender.renderMainFrame(req, res, next, 'learn');
});

module.exports = router;
