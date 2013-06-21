/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var troupeService = require("../services/troupe-service");
var winston = require("winston");
var userService = require("../services/user-service");
var unreadItemService = require("../services/unread-item-service");
var restSerializer = require("../serializers/rest-serializer");
var nconf = require('../utils/config');
var middleware = require('../web/middleware');
var oauthService = require("../services/oauth-service");
var middleware = require('../web/middleware');
var fileService = require("../services/file-service");
var chatService = require("../services/chat-service");
var Fiber = require("../utils/fiber");
var conversationService = require("../services/conversation-service");
var appVersion = require("../web/appVersion");
var loginUtils = require('../web/login-utils');
var uriService = require('../services/uri-service');

var useFirebugInIE = nconf.get('web:useFirebugInIE');

function createTroupeContext(req, options) {

  var disabledFayeProtocols = [];

  var userAgent = req.headers['user-agent'];
  userAgent = userAgent ? userAgent : '';

  var useFirebug = useFirebugInIE && userAgent.indexOf('MSIE') >= 0;

  // Disable websocket on Mobile due to iOS crash bug
  if(userAgent.indexOf('Mobile') >= 0) {
    disabledFayeProtocols.push('websocket');
  }

  return {
      user: options.user,
      troupe: options.troupe,
      accessToken: options.accessToken,
      profileNotCompleted: options.profileNotCompleted,
      accessDenied: options.accessDenied,
      inviteId: options.inviteId,
      appVersion: appVersion.getCurrentVersion(),
      baseServer: nconf.get('web:baseserver'),
      basePort: nconf.get('web:baseport'),
      basePath: nconf.get('web:basepath'),
      homeUrl: nconf.get('web:homeurl'),
      troupeUri: options.accessDenied ? options.troupe.uri : undefined,
      websockets: {
        fayeUrl: nconf.get('ws:fayeUrl') || "/faye",
        options: {
          timeout: nconf.get('ws:fayeTimeout'),
          retry: nconf.get('ws:fayeRetry')
        },
        disable: disabledFayeProtocols
      }
  };
}


function renderHomePage(req, res, next) {

  var strategy = new restSerializer.UserStrategy({ includeEmail: true });

  restSerializer.serialize(req.user, strategy, function(err, serialized) {
    if(err) return next(err);

    oauthService.findOrGenerateWebToken(req.user.id, function(err, token) {
      if(err) return next(err);
      var profileNotCompleted = req.user.status == 'PROFILE_NOT_COMPLETED';
      var troupeContext = createTroupeContext(req, { user: serialized, accessToken: token, profileNotCompleted: profileNotCompleted });
      var data = {};
      res.render('app-integrated', {
        useAppCache: !!nconf.get('web:useAppCache'),
        bootScriptName: 'router-homepage',
        data: JSON.stringify(data), // Only push the data through if the user is logged in already
        troupeName: req.user.displayName,
        troupeContext: JSON.stringify(troupeContext),
        troupeContextData: troupeContext
      });
    });
  });


}

function renderAppPageWithTroupe(req, res, next, page, troupe, troupeName, data, options) {
  if(!options) options = {};

  function serializeUserAndRenderPage(unreadItems) {
    if(!req.user) return renderPage(unreadItems, null, null);

    var strategy = new restSerializer.UserStrategy({ includeEmail: true });

    restSerializer.serialize(req.user, strategy, function(err, serialized) {
      if(err) return next(err);

      oauthService.findOrGenerateWebToken(req.user.id, function(err, token) {
        if(err) return next(err);

        renderPage(unreadItems, serialized, token);
      });

    });

  }
  serializeUserAndRenderPage(null);


  function renderPage(unreadItems, serializedUser, accessToken) {
    var profileNotCompleted;

    if (req.user) {
      var troupeStrategy = new restSerializer.TroupeStrategy({ currentUserId: (req.user) ? req.user.id : null, mapUsers: true });
      restSerializer.serialize(troupe, troupeStrategy, function(err, troupeData) {
        if(err) return next(err);

        sendPage(troupeData);
      });
    }
    else {
      sendPage(troupe);
    }

    function sendPage(troupeData) {

      var accessDenied, inviteId;

      if(req.user) {
        if(!troupeService.userHasAccessToTroupe(req.user, troupe)) {
          accessDenied = true;
          troupeData = null;

          // get the invite reference loaded in preload middleware (if any)
          inviteId = (req.invite) ? req.invite.id : null;
        }

        var status = req.user.status;
        profileNotCompleted = (status == 'PROFILE_NOT_COMPLETED') || (status == 'UNCONFIRMED');

        if(status != 'UNCONFIRMED' && status != 'PROFILE_NOT_COMPLETED' && status != 'ACTIVE') {
          // Oh dear, something has gone horribly wrong
          winston.error("Rejecting user. Something has gone wrong! ", { user: req.user });
          return next("Inconsistent state for user: " + status);
        }

      } else if (req.troupe.oneToOne) {
        troupeData = troupe;
      } else {
        troupeData = null;
      }

      var disabledFayeProtocols = [];

      var userAgent = req.headers['user-agent'];
      userAgent = userAgent ? userAgent : '';

      var useFirebug = useFirebugInIE && userAgent.indexOf('MSIE') >= 0;

      // Disable websocket on Mobile due to iOS crash bug
      if(userAgent.indexOf('Mobile') >= 0) {
        disabledFayeProtocols.push('websocket');
      }

      var troupeContext = {
          user: serializedUser,
          troupe: troupeData,
          accessToken: accessToken,
          profileNotCompleted: profileNotCompleted,
          accessDenied: accessDenied,
          inviteId: inviteId,
          appVersion: appVersion.getCurrentVersion(),
          baseServer: nconf.get('web:baseserver'),
          basePort: nconf.get('web:baseport'),
          basePath: nconf.get('web:basepath'),
          homeUrl: nconf.get('web:homeurl'),
          troupeUri: accessDenied ? troupe.uri : undefined,
          websockets: {
            fayeUrl: nconf.get('ws:fayeUrl') || "/faye",
            options: {
              timeout: nconf.get('ws:fayeTimeout'),
              retry: nconf.get('ws:fayeRetry')
            },
            disable: disabledFayeProtocols
          }
      };


      var login, actualTroupeName, bootScriptName;
      if(req.user && !profileNotCompleted && troupeData) {
        login  = false;
        actualTroupeName = troupeName;


        bootScriptName = "app-integrated";
        userService.saveLastVisitedTroupeforUser(req.user.id, troupe, function(err) {
          if (err) winston.info("Something went wrong saving the user last troupe visited: ", { exception: err });
        });

      } else {
        login = true;
        bootScriptName = "router-login";
        if(profileNotCompleted) {
          actualTroupeName = troupeName;
        } else {
          actualTroupeName = "Welcome";
        }
      }

      res.render(page, {
        useAppCache: !!nconf.get('web:useAppCache'),
        login: login,
        bootScriptName: bootScriptName,
        data: login ? null : JSON.stringify(data), // Only push the data through if the user is logged in already
        troupeName: actualTroupeName,
        troupeEmailAddress: troupe.uri + '@' + troupeContext.baseServer,
        troupeContext: JSON.stringify(troupeContext),
        troupeContextData: troupeContext,
        useFirebug: useFirebug
      });

    }

  }
}

function preloadTroupeMiddleware(req, res, next) {
  var appUri = req.params.appUri;

  troupeService.findByUri(appUri, function(err, troupe) {
    if (err) return next({ errorCode: 500, error: err });

    req.troupe = troupe;

    // check if the user has access
    if(req.user && troupe && !troupeService.userHasAccessToTroupe(req.user, troupe)) {
      // if not, check if the user has an unused invite
      troupeService.findUnusedInviteToTroupeForEmail(req.user.email, troupe.id, function(err, invite) {
        if (err) next(err);

        if (invite) {
          req.invite = invite;
        }

        next();
      });

      return;
    }

    next();
  });

}

function uriContextResolverMiddleware(req, res, next) {
  var appUri = req.params.appUri;
  uriService.findUri(appUri, req.user && req.user.id)
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
  if (!req.user) {
    req.troupe = { oneToOne: true };
    req.otherUser = { displayName: '' };
    return next();
  }

  if (req.params.userId === req.user.id) {
    winston.info('Another user is talking to themselves...', { userId: req.user.id });
    res.redirect(nconf.get('web:homeurl'));
    return 1;
  }

  troupeService.findOrCreateOneToOneTroupe(req.user.id, req.params.userId, function(err, troupe, otherUser) {
    if (err) return next({ errorCode: 500, error: err });
    if(!troupe) return next({ errorCode: 404 });
    req.otherUser = otherUser;
    req.troupe = troupe;
    next();
  });

}

module.exports = {
    install: function(app) {

      app.get('/messages', function(req, res) {
        var msgs = (req.session && req.session.messages) ? req.session.messages : [];
        res.json(msgs);
      });

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

      app.get('/s/cdn/*', function(req, res) {
        res.redirect(req.path.replace('/s/cdn', ''));
      });

      app.get('/one-one/:userId',
        middleware.grantAccessForRememberMeTokenMiddleware,
        preloadOneToOneTroupeMiddleware,

        function(req, res, next) {
          renderAppPageWithTroupe(req, res, next, 'app-integrated', req.troupe, req.otherUser.displayName);
        }
      );

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


      app.get('/one-one/:userId/chat',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        preloadOneToOneTroupeMiddleware,
        function(req, res, next) {
          renderAppPageWithTroupe(req, res, next, 'mobile/chat-app', req.troupe, req.otherUser.displayName, { otherUser: req.otherUser });
      });

      app.get('/one-one/:userId/files',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        preloadOneToOneTroupeMiddleware,
        function(req, res, next) {
          renderAppPageWithTroupe(req, res, next, 'mobile/file-app', req.troupe, req.otherUser.displayName, { otherUser: req.otherUser });
      });

      app.get('/version', function(req, res/*, next*/) {
        res.json({ appVersion: appVersion.getCurrentVersion() });
      });

      app.get('/:appUri',
        middleware.grantAccessForRememberMeTokenMiddleware,
        uriContextResolverMiddleware,
        function(req, res, next) {

          if (req.troupe) {
            winston.verbose("Serving troupe page");
            renderAppPageWithTroupe(req, res, next, 'app-integrated', req.troupe, req.troupe.name);
          } else if (req.uriContext.ownUrl) {
            winston.verbose("Serving viewer's home page");
            renderHomePage(req, res, next);
          } else {
            winston.verbose("No troupe or user found for this appUri");
            next(404);
          }
        });

      app.get('/:troupeUri/accept/:confirmationCode',
        middleware.authenticate('accept', {}),
        function(req, res/*, next*/) {
          res.relativeRedirect("/" + req.params.troupeUri);
        });

      app.get('/:appUri/chat',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        function(req, res, next) {
            renderAppPageWithTroupe(req, res, next, 'mobile/chat-app', req.troupe, req.troupe.name);
        });

      app.get('/:appUri/files',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        function(req, res, next) {
          renderAppPageWithTroupe(req, res, next, 'mobile/file-app', req.troupe, req.troupe.name);
        });

      app.get('/:appUri/mails',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        function(req, res, next) {
          renderAppPageWithTroupe(req, res, next, 'mobile/conversation-app', req.troupe, req.troupe.name);
        });

      app.get('/:appUri/people',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        function(req, res, next) {
          renderAppPageWithTroupe(req, res, next, 'mobile/people-app', req.troupe, req.troupe.name);
        });

      app.get('/:appUri/accessdenied', function(req, res) {
        res.render('app-accessdenied', {
        });
      });
    }
};