/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var appRender = require('./render');

module.exports = {
    install: function(app) {
      app.get('/mobile/chat', function(req, res, next) {
        appRender.renderMobileAppcacheChat(req, res, next);
      });
      app.get('/mobile/home', function(req, res, next) {
        appRender.renderMobileUserHomeApp(req, res, next);
      });
    }
};
