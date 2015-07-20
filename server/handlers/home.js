/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var appMiddleware      = require('./app/middleware');
var timezoneMiddleware = require('../web/middlewares/timezone');
var appRender          = require('./app/render');


module.exports = {
  install: function(app) {
    app.get('/home',
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

    // This is used from the explore page
    app.get('/home/createroom',
      ensureLoggedIn,
      function (req, res) {
        res.redirect('/home#createroom');
      });

    app.get('/home/explore',
      ensureLoggedIn,
      function (req, res, next) {
        req.uriContext = {
          uri: 'home'
        };

        appRender.renderMainFrame(req, res, next, 'explore');
      });

    app.get('/home/learn',
      ensureLoggedIn,
      function (req, res, next) {
        req.uriContext = {
          uri: 'learn'
        };

        appRender.renderMainFrame(req, res, next, 'learn');
      });

    app.get('/learn/~learn',
      ensureLoggedIn,
      function(req, res) {
        res.render('learn');
      });

  }
};
