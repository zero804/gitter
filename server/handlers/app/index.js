/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware      = require('../../web/middleware');
var appRender       = require('./render');
var archives        = require('./archives');
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
        });

    app.get('/:userOrOrg/-/home',
      middleware.grantAccessForRememberMeTokenMiddleware,
      middleware.ensureLoggedIn(),
      appMiddleware.uriContextResolverMiddleware,
      appMiddleware.isPhoneMiddleware,
      function(req, res, next) {
        appRender.renderHomePage(req, res, next);
      });

    app.get('/:userOrOrg/-/chat',
      middleware.grantAccessForRememberMeTokenMiddleware,
      middleware.ensureLoggedIn(),
      appMiddleware.uriContextResolverMiddleware,
      appMiddleware.isPhoneMiddleware,
      function(req, res, next) {
        appRender.renderChatPage(req, res, next);
      });

      app.get('/:userOrOrg/:repo',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        appMiddleware.uriContextResolverMiddleware,
        appMiddleware.isPhoneMiddleware,
        function(req, res, next) {
          if(req.isPhone) {
            appRender.renderMobileChat(req, res, next);
          } else {
            appRender.renderMainFrame(req, res, next, 'chat');
          }
        });

      app.get('/:userOrOrg/:repo/archive/', archives.repo.landing);

      app.get('/:userOrOrg/:repo/chat',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        appMiddleware.uriContextResolverMiddleware,
        appMiddleware.isPhoneMiddleware,
        function(req, res, next) {
          appRender.renderChatPage(req, res, next);
        });



      // require('./native-redirects').install(app);
      require('./integrations').install(app);
    }
};
