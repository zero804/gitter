/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var ensureLoggedIn = require('../../web/middlewares/ensure-logged-in');
var converter = require('../../web/url-converter');
var appRender = require('./render');

// expire in 3 hours
var EXPIRES_SECONDS = 60 * 60 * 3;
var EXPIRES_MILLISECONDS = EXPIRES_SECONDS * 1000;

module.exports = {
  install: function(app) {
    app.get('/mobile/embedded-chat', appRender.renderMobileNativeEmbeddedChat);

    /*
     * DEPRECATED, only used by gitter ios < v1.3.0 
     * ITS FULL OF APPCACHE MESS
     */
    app.get('/mobile/chat', ensureLoggedIn, function(req, res, next) {
      res.setHeader('Cache-Control', 'public, max-age=' + EXPIRES_SECONDS);
      res.setHeader('Expires', new Date(Date.now() + EXPIRES_MILLISECONDS).toUTCString());
      appRender.renderMobileNativeChat(req, res, next);
    });
    app.get('/mobile/home', ensureLoggedIn, function(req, res, next) {
      res.setHeader('Cache-Control', 'public, max-age=' + EXPIRES_SECONDS);
      res.setHeader('Expires', new Date(Date.now() + EXPIRES_MILLISECONDS).toUTCString());
      appRender.renderMobileNativeUserhome(req, res, next);
    });
    app.get('/mobile/redirect', ensureLoggedIn, function(req, res, next) {
      var desktopUrl = req.query.desktopUrl;
      converter.desktopToMobile(desktopUrl, req.user).then(function(mobileUrl) {
        res.redirect(mobileUrl);
      }).fail(next);
    });
  }
};
