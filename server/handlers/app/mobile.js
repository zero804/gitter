/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var ensureLoggedIn = require('../../web/middlewares/ensure-logged-in');
var appRender = require('./render');

module.exports = {
  install: function(app) {
    app.get('/mobile/embedded-chat', appRender.renderMobileNativeEmbeddedChat);

    app.get('/mobile/home', ensureLoggedIn, appRender.renderMobileNativeUserhome);
  }
};
