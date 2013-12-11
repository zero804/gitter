/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware      = require('../../web/middleware');
var appRender       = require('./render');
var appMiddleware   = require('./middleware');
var limitedReleaseService = require('../../services/limited-release-service');

module.exports = {
    install: function(app) {
      app.get('/:userOrOrg',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        appMiddleware.uriContextResolverMiddleware,
        appMiddleware.isPhoneMiddleware,
        function(req, res, next) {
          if (req.uriContext.ownUrl) {
            return limitedReleaseService.shouldUserBeTurnedAway(req.user)
              .then(function(allow) {
                if(allow) {
                  return appRender.renderHomePage(req, res, next);
                } else {
                  var email = req.user.emails[0];
                  return res.render('thanks', { email: email, userEmailAccess: req.user.hasGitHubScope('user:email') });
                }
              })
              .fail(next);
          }

          if(req.isPhone) {
            // TODO: this should change from chat-app to a seperate mobile app
            appRender.renderAppPageWithTroupe(req, res, next, 'mobile/mobile-app');
          } else {
            appRender.renderAppPageWithTroupe(req, res, next, 'app-template');
          }
        });

      app.get('/:userOrOrg/:repo',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        appMiddleware.uriContextResolverMiddleware,
        appMiddleware.isPhoneMiddleware,
        function(req, res, next) {
          if(req.isPhone) {
            // TODO: this should change from chat-app to a seperate mobile app
            appRender.renderAppPageWithTroupe(req, res, next, 'mobile/mobile-app');
          } else {
            appRender.renderAppPageWithTroupe(req, res, next, 'app-template');
          }
        });



      // require('./native-redirects').install(app);
      require('./integrations').install(app);
    }
};
