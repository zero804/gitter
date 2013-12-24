/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware      = require('../../web/middleware');
var appRender       = require('./render');
var appMiddleware   = require('./middleware');
var limitedReleaseService = require('../../services/limited-release-service');


var chatFrameMiddlewarePipeline = [
  middleware.grantAccessForRememberMeTokenMiddleware,
  middleware.ensureLoggedIn(),
  appMiddleware.uriContextResolverMiddleware,
  appMiddleware.isPhoneMiddleware,
  function(req, res, next) {
    /* This can only happen on some /userOrOrg uris */
    if (req.uriContext.ownUrl) {
      return limitedReleaseService.shouldUserBeTurnedAway(req.user)
        .then(function(allow) {
          if(allow) {
            if(req.isPhone) {
              appRender.renderMobileUserHome(req, res, next, 'home');
            } else {
              appRender.renderMainFrame(req, res, next, 'home');
            }
          } else {
            var email = req.user.emails[0];
            return res.render('thanks', { email: email, userEmailAccess: req.user.hasGitHubScope('user:email') });
          }
        })
        .fail(next);
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
        '/:userOrOrg/-/chat',
        '/:userOrOrg/:repo/chat'
      ].forEach(function(path) {
        app.get(path,
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

      app.get(/\/(?:([^\/]+?))\/(?:([^\/]+?))\/(?:\*([^\/]+?))\/?/,
        function(req, res, next) {
          req.params.userOrOrg = req.params[0];
          req.params.repo = req.params[1];
          req.params.channel = req.params[2];
          next();
        },
        chatFrameMiddlewarePipeline);

      app.get(/\/(?:([^\/]+?))\/(?:\*([^\/]+))/,
        function(req, res, next) {
          req.params.userOrOrg = req.params[0];
          req.params.channel = req.params[1];
          console.log('WHAT IS THIS!!', req.params);
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
