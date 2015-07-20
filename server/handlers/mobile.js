"use strict";

var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var converter = require('../web/url-converter');
var appRender = require('./app/render');
var express = require('express');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/embedded-chat', appRender.renderMobileNativeEmbeddedChat);

router.get('/home', ensureLoggedIn, appRender.renderMobileNativeUserhome);

router.get('/redirect', ensureLoggedIn, function(req, res, next) {
  var desktopUrl = req.query.desktopUrl;
  converter.desktopToMobile(desktopUrl, req.user)
    .then(function(mobileUrl) {
      res.redirect(mobileUrl);
    })
    .fail(next);
});

module.exports = router;
