/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware        = require('../../web/middleware');
var appRender         = require('./render');
var appMiddleware     = require('./middleware');

var mainFrameMiddlewarePipeline = [
  appMiddleware.isPhoneMiddleware,
  middleware.grantAccessForRememberMeTokenMiddleware,
  function(req, res, next) {
    appRender.renderMobileAppcacheChat(req, res, next);
  }
];

var userhomeMiddlewarePipeline = [
  appMiddleware.isPhoneMiddleware,
  middleware.grantAccessForRememberMeTokenMiddleware,
  function(req, res, next) {
    appRender.renderMobileUserHomeApp(req, res, next);
  }
];

module.exports = {
    install: function(app) {
      app.get('/mobile/chat', mainFrameMiddlewarePipeline);
      app.get('/mobile/home', userhomeMiddlewarePipeline);
    }
};
