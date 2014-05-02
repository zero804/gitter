/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var appRender         = require('./render');
var appMiddleware     = require('./middleware');

var mainFrameMiddlewarePipeline = [
  appMiddleware.isPhoneMiddleware,
  function(req, res, next) {
    appRender.renderMobileAppcacheChat(req, res, next);
  }
];

module.exports = {
    install: function(app) {
        app.get('/mobile/chat', mainFrameMiddlewarePipeline);
    }
};
