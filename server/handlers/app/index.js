/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware      = require('../../web/middleware');
var appRender       = require('./render');
var appMiddleware   = require('./middleware');

module.exports = {
    install: function(app) {
      app.get('/:userOrOrg',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        appMiddleware.uriContextResolverMiddleware,
        appMiddleware.isPhoneMiddleware,
        function(req, res, next) {
          if (req.uriContext.ownUrl) {
            return appRender.renderHomePage(req, res, next);
          }

          // if(req.isPhone) {
          //   // TODO: this should change from chat-app to a seperate mobile app
          //   appRender.renderAppPageWithTroupe(req, res, next, 'mobile/mobile-app');
          // } else {
            appRender.renderAppPageWithTroupe(req, res, next, 'app-template');
          // }
        });

      app.get('/:userOrOrg/issues', function(req, res) {
        var term = req.query.q || '';
        var matches = [
          {
            id: '1234',
            description: 'PC LOAD LETTER'
          },
          {
            id: '1235',
            description: 'No keyboard detected. Press F1 to resume.'
          }
        ].filter(function(issue) {
          return issue.id.indexOf(term) === 0;
        });
        res.send(matches);
      });

      // require('./native-redirects').install(app);
      // require('./invites').install(app);
      require('./integrations').install(app);

    }
};
