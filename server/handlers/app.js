/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var troupeService = require("../services/troupe-service");
var winston = require("winston");
var userService = require("../services/user-service");
var unreadItemService = require("../services/unread-item-service");
var restSerializer = require("../serializers/rest-serializer");
var nconf = require('../utils/config');
var middleware = require('../web/middleware');
var oauthService = require("../services/oauth-service");

function renderAppPage(req, res, next, page) {

  var appUri = req.params.appUri;

  troupeService.findByUri(appUri, function(err, troupe) {
    if(err) return next(err);
    if(!troupe) return next("Troupe: " + appUri + " not found.");

    if(req.user) {
      unreadItemService.getUnreadItemsForUser(req.user.id, troupe.id, function(err, unreadItems) {
        if(err) return next(err);
        serializeUserAndRenderPage(unreadItems);
      });

    } else {
      serializeUserAndRenderPage(null);
    }

    function serializeUserAndRenderPage(unreadItems) {
      if(!req.user) return renderPage(unreadItems, null, null);

      var strategy = new restSerializer.UserStrategy();

      restSerializer.serialize(req.user, strategy, function(err, serialized) {
        if(err) return next(err);

        oauthService.findOrGenerateWebToken(req.user.id, function(err, token) {
          if(err) return next(err);

          renderPage(unreadItems, serialized, token);
        });

      });

    }

    function getFayeUrl() {
      var url = nconf.get('ws:fayeUrl');
      if(url) return url;

      return "/faye";
    }

    function renderPage(unreadItems, serializedUser, accessToken) {
      var profileNotCompleted;

      var troupeData = {
        "uri": troupe.uri,
        "id": troupe.id,
        "name": troupe.name
      };
      var accessDenied;

      if(req.user) {
        if(!troupeService.userHasAccessToTroupe(req.user, troupe)) {
          accessDenied = true;
          troupeData = null;
        }

        profileNotCompleted = req.user.status == 'PROFILE_NOT_COMPLETED';
      } else {
        troupeData = null;
      }

      var troupeContext = {
          user: serializedUser,
          troupe: troupeData,
          accessToken: accessToken,
          profileNotCompleted: profileNotCompleted,
          unreadItems: unreadItems,
          accessDenied: accessDenied,
          basePath: nconf.get('web:basepath'),
          websockets: {
            fayeUrl: getFayeUrl(),
            options: {
              timeout: 120,
              retry: 5
            },
            disable: ['websocket']
          }


      };


      var login, troupeName;
      if(req.user && !profileNotCompleted && troupeData) {
        login  = false;
        troupeName = troupe.name;

        userService.saveLastVisitedTroupeforUser(req.user.id, troupe.id, function(err) {
          if (err) winston.info("Something went wrong saving the user last troupe visited: ", { exception: err });
        });

      } else {
        login = true;
        if(profileNotCompleted) {
          troupeName = troupe.name;
        } else {
          troupeName = "Welcome";
        }
      }

      res.render(page, {
        login: login,
        troupeName: troupeName,
        troupeContext: JSON.stringify(troupeContext)
      });

    }

  });
}

module.exports = {
    install: function(app) {
      app.get('/:appUri', function(req, res, next) {
        var page;
        if(req.headers['user-agent'].indexOf('Mobile') >= 0) {
          page = 'app-mobile';
        } else {
          page = 'app-integrated';
        }

        renderAppPage(req, res, next, page);


      });

      app.get('/:appUri/chat',
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          renderAppPage(req, res, next, 'mobile/chat-app');
        });

      app.get('/:appUri/files',
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          renderAppPage(req, res, next, 'mobile/file-app');
        });

      app.get('/:appUri/mails',
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          renderAppPage(req, res, next, 'mobile/conversation-app');
        });

      app.get('/:appUri/people',
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          renderAppPage(req, res, next, 'mobile/people-app');
        });

      app.get('/:appUri/accessdenied', function(req, res, next) {
        res.render('app-accessdenied', {
        });
      });
    }
};