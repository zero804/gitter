/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware      = require('../../web/middleware');
var appRender       = require('./render');
var appMiddleware   = require('./middleware');

var chatFrameMiddlewarePipeline = [
  middleware.grantAccessForRememberMeTokenMiddleware,
  middleware.ensureLoggedIn(),
  appMiddleware.uriContextResolverMiddleware,
  appMiddleware.isPhoneMiddleware,
  function(req, res, next) {
    if (req.uriContext.ownUrl) {
      if(req.isPhone) {
        appRender.renderMobileUserHome(req, res, next, 'home');
      } else {
        appRender.renderMainFrame(req, res, next, 'home');
      }
      return;
    }

    if(req.isPhone) {
      appRender.renderMobileChat(req, res, next);
    } else {
      appRender.renderMainFrame(req, res, next, 'chat');
    }
  }
];

var chatMiddlewarePipeline = [
  middleware.grantAccessForRememberMeTokenMiddleware,
  middleware.ensureLoggedIn(),
  appMiddleware.uriContextResolverMiddleware,
  appMiddleware.isPhoneMiddleware,
  function(req, res, next) {
    appRender.renderChatPage(req, res, next);
  }
];


module.exports = {
    install: function(app) {
      [
        '/:roomPart1/~chat',                         // ORG or ONE_TO_ONE
        '/:roomPart1/:roomPart2/~chat',              // REPO or ORG_CHANNEL or ADHOC
        '/:roomPart1/:roomPart2/:roomPart3/~chat',   // CUSTOM REPO_ROOM

        // These URLs is deprecated. Remove after second master deployment
        '/:roomPart1/-/chat',                       // ORG or ONE_TO_ONE
        '/:roomPart1/:roomPart2/chat',              // REPO or ORG_CHANNEL or ADHOC
        '/:roomPart1/:roomPart2/:roomPart3/chat',   // REPO_CHANNEL
      ].forEach(function(path) {
        app.get(path,
          function(req, res, next) {
            var uri = normaliseUrl(req.params);
            // req.params.userOrOrg = req.params[0];
            // req.params.repo = req.params[1];
            // req.params.channel = req.params[2];
            next();
          },
          chatMiddlewarePipeline);
      });

      app.get('/:userOrOrg/-/home',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        appMiddleware.uriContextResolverMiddleware,
        appMiddleware.isPhoneMiddleware,
        function(req, res, next) {
          appRender.renderHomePage(req, res, next);
        });

      require('./integrations').install(app);

      app.get(/^\/(?:([^\/]+?))\/(?:([^\/]+?))\/(?:\*([^\/]+))\/?$/,
        function(req, res, next) {
          req.params.userOrOrg = req.params[0];
          req.params.repo = req.params[1];
          req.params.channel = req.params[2];
          next();
        },
        chatFrameMiddlewarePipeline);

      app.get(/^\/(?:([^\/]+?))\/(?:\*([^\/]+))$/,
        function(req, res, next) {
          req.params.userOrOrg = req.params[0];
          req.params.channel = req.params[1];
          next();
        },
        chatFrameMiddlewarePipeline);

      [
        '/:userOrOrg',
        '/:userOrOrg/:repo',
      ].forEach(function(path) {
        app.get(path, chatFrameMiddlewarePipeline);
      });
    }
};
