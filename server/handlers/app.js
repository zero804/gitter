/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var winston = require("winston");
var userService = require("../services/user-service");
var restSerializer = require("../serializers/rest-serializer");
var nconf = require('../utils/config');
var middleware = require('../web/middleware');
var oauthService = require("../services/oauth-service");
var middleware = require('../web/middleware');
var appVersion = require("../web/appVersion");
var loginUtils = require('../web/login-utils');
var uriService = require('../services/uri-service');
var Q = require('q');
var useFirebugInIE = nconf.get('web:useFirebugInIE');

function serializeUser(user) {
  var strategy = new restSerializer.UserStrategy({ includeEmail: true });

  return restSerializer.serializeQ(user, strategy);
}

function serializeHomeUser(user) {
  var strategy = new restSerializer.UserStrategy({ includeEmail: false, hideLocation: true });

  return restSerializer.serializeQ(user, strategy);
}


function getWebToken(user) {
  return oauthService.findOrGenerateWebToken(user.id);
}

function serializeTroupe(troupe, user) {
  var strategy = new restSerializer.TroupeStrategy({ currentUserId: user ? user.id : null });

  return restSerializer.serializeQ(troupe, strategy);
}

function fakeSerializedTroupe(uriContext) {
  var oneToOne = uriContext.oneToOne;
  var otherUser = uriContext.otherUser;
  var troupe = uriContext.troupe;

  var uri = (oneToOne ?  (otherUser.username || "one-one/" + otherUser.id ) : troupe.uri);

  var url = "/" + uri;

  return {
    oneToOne: oneToOne,
    uri: uri,
    url: url,
    name: otherUser && otherUser.username ? otherUser.username : 'Welcome'
  };

}



function createTroupeContext(req, options) {

  var disabledFayeProtocols = [];

  var userAgent = req.headers['user-agent'];
  userAgent = userAgent ? userAgent : '';

  // Disable websocket on Mobile due to iOS crash bug
  if(userAgent.indexOf('Mobile') >= 0) {
    disabledFayeProtocols.push('websocket');
  }

  var useFirebug = useFirebugInIE && userAgent.indexOf('MSIE') >= 0;

  return {
      user: options.user,
      troupe: options.troupe,
      homeUser: options.homeUser,
      inUserhome: options.inUserhome,
      accessToken: options.accessToken,
      profileNotCompleted: options.profileNotCompleted,
      accessDenied: options.accessDenied,
      inviteId: options.inviteId,
      appVersion: appVersion.getCurrentVersion(),
      baseServer: nconf.get('web:baseserver'),
      basePort: nconf.get('web:baseport'),
      basePath: nconf.get('web:basepath'),
      homeUrl: nconf.get('web:homeurl'),

      troupeUri: options.troupe ? options.troupe.uri : undefined,
      websockets: {
        fayeUrl: nconf.get('ws:fayeUrl') || "/faye",
        options: {
          timeout: nconf.get('ws:fayeTimeout'),
          retry: nconf.get('ws:fayeRetry')
        },
        disable: disabledFayeProtocols
      },
      useFirebug: useFirebug
  };
}


function renderHomePage(req, res, next) {
  var user = req.user;


  Q.all([ serializeUser(user), getWebToken(user) ])
    .spread(function(serializedUser, token) {
      var profileNotCompleted = user.status == 'PROFILE_NOT_COMPLETED';
      var troupeContext = createTroupeContext(req, {
        user: serializedUser,
        accessToken: token,
        profileNotCompleted: profileNotCompleted,
        inUserhome: true
      });

      res.render('app-template', {
        useAppCache: !!nconf.get('web:useAppCache'),
        bootScriptName: 'router-homepage',
        troupeName: req.user.displayName,
        troupeContext: JSON.stringify(troupeContext),
        troupeContextData: troupeContext
      });
    })
    .fail(next);


}

function renderAppPageWithTroupe(req, res, next, page) {
  var user = req.user;
  var troupe = req.uriContext.troupe;
  var invite = req.uriContext.invite;
  var homeUser = req.uriContext.oneToOne && req.uriContext.otherUser; // The users page being looked at
  var accessDenied = !req.uriContext.access;

  Q.all([
    user ? serializeUser(user) : null,
    homeUser ? serializeHomeUser(homeUser) : undefined,
    user ? getWebToken(user) : null,
    troupe && user ? serializeTroupe(troupe, user) : fakeSerializedTroupe(req.uriContext) ])
    .spread(function(serializedUser, serializedHomeUser, token, serializedTroupe) {

      var status, profileNotCompleted;
      if(user) {
        status = user.status;
        profileNotCompleted = (status == 'PROFILE_NOT_COMPLETED') || (status == 'UNCONFIRMED');
      }

      var login = !user || profileNotCompleted || accessDenied;

      var troupeContext = createTroupeContext(req, {
        user: serializedUser,
        homeUser: serializedHomeUser,
        troupe: serializedTroupe,
        accessToken: token,
        profileNotCompleted: profileNotCompleted,
        inviteId: invite && invite.id,
        accessDenied: accessDenied
      });

      res.render(page, {
        useAppCache: !!nconf.get('web:useAppCache'),
        login: login,
        bootScriptName: login ? "router-login" : "router-app",
        troupeName: serializedTroupe.name,
        troupeContext: JSON.stringify(troupeContext),
        troupeContextData: troupeContext
      });

    })
    .fail(next);

}

function uriContextResolverMiddleware(req, res, next) {
  var appUri = req.params.appUri;

  uriService.findUriForUser(appUri, req.user && req.user.id)
    .then(function(result) {
      if(result.notFound) return next(404);

      req.troupe = result.troupe;
      req.uriContext = result;

      next();
    })
    .fail(next);
}

// TODO preload invites?

function preloadOneToOneTroupeMiddleware(req, res, next) {
  uriService.findUriForUser("one-one/" + req.params.userId, req.user && req.user.id)
    .then(function(result) {
      if(result.notFound) return next(404);

      req.troupe = result.troupe;
      req.uriContext = result;

      next();
    })
    .fail(next);

}

function saveLastTroupeMiddleware(req, res, next) {
  if(req.user && req.troupe) {
    userService.saveLastVisitedTroupeforUser(req.user.id, req.troupe, function(err) {
      if (err) winston.info("Something went wrong saving the user last troupe visited: ", { exception: err });
      next();

    });
    return;
  }

  next();
}


function renderMiddleware(page) {
  return function(req, res, next) {
    renderAppPageWithTroupe(req, res, next, page);
  };
}

module.exports = {
    install: function(app) {
      // used for development only
      app.get('/mobile.appcache', function(req, res) {
        if (nconf.get('web:useAppCache')) {
          res.type('text/cache-manifest');
          res.sendfile('public/templates/mobile.appcache');
        }
        else {
          res.send(404);
        }
      });

      // This really doesn't seem like the right place for this?
      app.get('/s/cdn/*', function(req, res) {
        res.redirect(req.path.replace('/s/cdn', ''));
      });

      app.get('/version', function(req, res/*, next*/) {
        res.json({ appVersion: appVersion.getCurrentVersion() });
      });


      app.get('/last',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          loginUtils.redirectUserToDefaultTroupe(req, res, next);
        });

      app.get('/last/:page',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        function(req, res, next) {

          loginUtils.whereToNext(req.user, function(err, url) {
            if (err || !url) next(err);

            res.relativeRedirect(url + "/" + req.params.page);
          });

        });

      app.get('/one-one/:userId',
        middleware.grantAccessForRememberMeTokenMiddleware,
        preloadOneToOneTroupeMiddleware,
        saveLastTroupeMiddleware,
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
        renderMiddleware('app-template')
      );

      app.get('/one-one/:userId/chat',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        preloadOneToOneTroupeMiddleware,
        saveLastTroupeMiddleware,
        renderMiddleware('mobile/chat-app'));

      app.get('/:appUri/chat',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        saveLastTroupeMiddleware,
        renderMiddleware('mobile/chat-app'));

      app.get('/one-one/:userId/files',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        preloadOneToOneTroupeMiddleware,
        saveLastTroupeMiddleware,
        renderMiddleware('mobile/file-app'));

      app.get('/:appUri/files',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        saveLastTroupeMiddleware,
        renderMiddleware('mobile/file-app'));


      app.get('/:appUri/mails',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        saveLastTroupeMiddleware,
        renderMiddleware('mobile/conversation-app'));

      app.get('/:appUri/people',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        saveLastTroupeMiddleware,
        renderMiddleware('mobile/people-app'));

      app.get('/:appUri',
        middleware.grantAccessForRememberMeTokenMiddleware,
        uriContextResolverMiddleware,
        saveLastTroupeMiddleware,
        function(req, res, next) {
          if (req.uriContext.ownUrl) {
            return renderHomePage(req, res, next);
          }

          renderAppPageWithTroupe(req, res, next, 'app-template');
        });

      app.get('/:troupeUri/accept/:confirmationCode',
        middleware.authenticate('accept', {}),
        function(req, res/*, next*/) {
          res.relativeRedirect("/" + req.params.troupeUri);
        });

      app.get('/:appUri/accessdenied', function(req, res) {
        res.render('app-accessdenied', {
        });
      });
    }
};