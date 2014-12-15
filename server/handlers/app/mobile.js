/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var ensureLoggedIn = require('../../web/middlewares/ensure-logged-in');
var converter = require('../../web/url-converter');
var appRender = require('./render');

module.exports = {
  install: function(app) {
    app.get('/mobile/embedded-chat', appRender.renderMobileNativeEmbeddedChat);

    app.get('/mobile/home', ensureLoggedIn, appRender.renderMobileNativeUserhome);

    app.get('/mobile/redirect', ensureLoggedIn, function(req, res, next) {
      var desktopUrl = req.query.desktopUrl;
      converter.desktopToMobile(desktopUrl, req.user)
        .then(function(mobileUrl) {
          res.redirect(mobileUrl);
        })
        .fail(next);
    });
  }
};
