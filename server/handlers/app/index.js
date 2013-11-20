/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var uriService      = require('../../services/uri-service');
var middleware      = require('../../web/middleware');
var appRender       = require('./render');

module.exports = {
    install: function(app) {
      app.get('/:userOrOrg',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          return uriService.findUriForUser(req.user, req.params.userOrOrg)
            .then(function(uriLookup) {
              req.troupe = uriLookup.troupe;
              req.uriContext = uriLookup;
              next();
            })
            .fail(next);
        },
        appRender.renderMiddleware('app-template')
      );

      // /* Special homepage for users without usernames */
      // app.get('/home',
      //   middleware.grantAccessForRememberMeTokenMiddleware,
      //   appMiddleware.isPhoneMiddleware,
      //   function(req, res, next) {
      //     if(req.user && req.user.username) {
      //       res.relativeRedirect(req.user.getHomeUrl());
      //       return;
      //     }

      //     return appRender.renderHomePage(req, res, next);
      //   });


      // app.get('/:appUri',
      //   middleware.grantAccessForRememberMeTokenMiddleware,
      //   appMiddleware.uriContextResolverMiddleware,
      //   appMiddleware.isPhoneMiddleware,
      //   appMiddleware.unauthenticatedPhoneRedirectMiddleware,
      //   function(req, res, next) {
      //     if (req.uriContext.ownUrl) {
      //       return appRender.renderHomePage(req, res, next);
      //     }

      //     if(req.isPhone) {
      //       // TODO: this should change from chat-app to a seperate mobile app
      //       appRender.renderAppPageWithTroupe(req, res, next, 'mobile/mobile-app');
      //     } else {
      //       appRender.renderAppPageWithTroupe(req, res, next, 'app-template');
      //     }
      //   });

      // require('./native-redirects').install(app);
      // require('./invites').install(app);
      // require('./integrations').install(app);

    }
};
