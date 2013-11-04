/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf           = require('../utils/config');
var middleware      = require('../web/middleware');
var appRender       = require('./app/render');
var appMiddleware   = require('./app/middleware');

module.exports = {
    install: function(app) {
      app.get('/one-one/:userId',
        middleware.grantAccessForRememberMeTokenMiddleware,
        appMiddleware.preloadOneToOneTroupeMiddleware,
        function(req, res, next) {
          var uriContext = req.uriContext;

          if (req.user && req.params.userId === req.user.id) {
            res.relativeRedirect(req.user.username ? "/" + req.user.username : nconf.get('web:homeurl'));
            return;
          }

          // If the user has a username, use that instead
          if(uriContext && uriContext.otherUser && uriContext.otherUser.username) {
            res.relativeRedirect('/' + uriContext.otherUser.username);
            return;
          }

          next();
        },
        appRender.renderMiddleware('app-template')
      );

      /* Special homepage for users without usernames */
      app.get('/home',
        middleware.grantAccessForRememberMeTokenMiddleware,
        appMiddleware.isPhoneMiddleware,
        function(req, res, next) {
          if(req.user && req.user.username) {
            res.relativeRedirect(req.user.getHomeUrl());
            return;
          }

          return appRender.renderHomePage(req, res, next);
        });


      app.get('/:appUri',
        middleware.grantAccessForRememberMeTokenMiddleware,
        appMiddleware.uriContextResolverMiddleware,
        appMiddleware.isPhoneMiddleware,
        appMiddleware.unauthenticatedPhoneRedirectMiddleware,
        function(req, res, next) {
          if (req.uriContext.ownUrl) {
            return appRender.renderHomePage(req, res, next);
          }

          if(req.isPhone) {
            // TODO: this should change from chat-app to a seperate mobile app
            appRender.renderAppPageWithTroupe(req, res, next, 'mobile/mobile-app');
          } else {
            appRender.renderAppPageWithTroupe(req, res, next, 'app-template');
          }
        });

      require('./app-native-redirects').install(app);
      require('./app-invites').install(app);

    }
};
