/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var winston = require("winston");
var troupeService = require("../services/troupe-service");
var nconf = require('../utils/config');
var middleware = require('../web/middleware');
var middleware = require('../web/middleware');
var appVersion = require("../web/appVersion");
var loginUtils = require('../web/login-utils');
var uriService = require('../services/uri-service');
var unreadItemService = require('../services/unread-item-service');

var Q = require('q');
var isPhone = require('../web/is-phone');
var contextGenerator = require('../web/context-generator');

function renderHomePage(req, res, next) {
  var user = req.user;
  var accessDenied = !req.user;

  contextGenerator.generateMiniContext(req, function(err, troupeContext) {
    if(err) {
      next(err);
    } else {
      var login = !user || troupeContext.profileNotCompleted || accessDenied;

      var bootScript;
      if(req.isPhone) {
        bootScript = 'mobile-userhome';
      } else if(login) {
        bootScript = 'router-login';
      } else {
        bootScript = 'router-homepage';
      }

      res.render(req.isPhone ? 'mobile/mobile-app' : 'app-template', {
        useAppCache: !!nconf.get('web:useAppCache'),
        bootScriptName: bootScript,
        isWebApp: true,
        troupeName: (req.user && req.user.displayName) || '',
        troupeContext: troupeContext,
        agent: req.headers['user-agent']
      });
    }
  });
}

function getAppCache(req) {
  if(!nconf.get('web:useAppCache')) return;
  return req.url + '.appcache';
}

function renderAppPageWithTroupe(req, res, next, page) {
  var user = req.user;
  var accessDenied = !req.uriContext.access;

  Q.all([
      req.user ? unreadItemService.getBadgeCountsForUserIds([req.user.id]) : null,
      contextGenerator.generateTroupeContext(req)
    ])
    .spread(function(unreadCount, troupeContext) {
      var login = !user || accessDenied;

      var bootScript;
      if(req.isPhone) {
        bootScript = 'mobile-app';
      } else if(login) {
        bootScript = 'router-login';
      } else {
        bootScript = 'router-app';
      }

      res.render(page, {
        appCache: getAppCache(req),
        login: login,
        isWebApp: !req.params.mobilePage, // TODO: fix this!
        bootScriptName: bootScript,
        unreadCount: unreadCount && unreadCount[req.user.id],
        troupeName: troupeContext.troupe.name,
        troupeContext: troupeContext,
        agent: req.headers['user-agent']
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

function isPhoneMiddleware(req, res, next) {
  req.isPhone = isPhone(req.headers['user-agent']);
  next();
}

function unauthenticatedPhoneRedirectMiddleware(req, res, next) {
  if(req.isPhone && !req.user) {
    res.redirect('/login');
  } else {
    next();
  }
}

function renderMiddleware(template, mobilePage) {
  return function(req, res, next) {
    if(mobilePage) req.params.mobilePage = mobilePage;
    renderAppPageWithTroupe(req, res, next, template);
  };
}

function redirectToNativeApp(page) {
  return function(req, res) {
    res.relativeRedirect('/mobile/' + page + '#' + req.troupe.id);
  };
}

module.exports = {
    install: function(app) {
      // This really doesn't seem like the right place for this?
      app.get('/s/cdn/*', function(req, res) {
        res.redirect(req.path.replace('/s/cdn', ''));
      });

      app.get('/version', function(req, res/*, next*/) {
        res.json({ appVersion: appVersion.getAppTag() });
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

          return troupeService.findBestTroupeForUser(req.user)
            .then(function(troupe) {
              if(troupe) {
                return '/mobile/' + req.params.page + '#' + troupe.id;
              }

              if(req.user.hasUsername()) {
                return req.user.getHomeUrl();
              } else {
                return "/home";
              }

            })
            .then(function(url) {
              res.relativeRedirect(url);
            })
            .fail(next);

        });

      app.get('/one-one/:userId',
        middleware.grantAccessForRememberMeTokenMiddleware,
        preloadOneToOneTroupeMiddleware,
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

      /* Special homepage for users without usernames */
      app.get('/home',
        middleware.grantAccessForRememberMeTokenMiddleware,
        isPhoneMiddleware,
        function(req, res, next) {
          if(req.user && req.user.username) {
            res.relativeRedirect(req.user.getHomeUrl());
            return;
          }

          return renderHomePage(req, res, next);
        });

      // Chat -----------------------

      app.get('/one-one/:userId/chat',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        preloadOneToOneTroupeMiddleware,
        redirectToNativeApp('chat'));

      app.get('/:appUri/chat',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        redirectToNativeApp('chat'));

      // Files -----------------------
      app.get('/one-one/:userId/files',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        preloadOneToOneTroupeMiddleware,
        redirectToNativeApp('files'));

      app.get('/:appUri/files',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        redirectToNativeApp('files'));


      app.get('/:appUri/mails',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        redirectToNativeApp('mails'));

      app.get('/:appUri/people',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        redirectToNativeApp('people'));

      app.get('/:appUri',
        middleware.grantAccessForRememberMeTokenMiddleware,
        uriContextResolverMiddleware,
        isPhoneMiddleware,
        unauthenticatedPhoneRedirectMiddleware,
        function(req, res, next) {
          if (req.uriContext.ownUrl) {
            return renderHomePage(req, res, next);
          }

          if(req.isPhone) {
            // TODO: this should change from chat-app to a seperate mobile app
            renderAppPageWithTroupe(req, res, next, 'mobile/mobile-app');
          } else {
            renderAppPageWithTroupe(req, res, next, 'app-template');
          }
        });

      function acceptInviteWithoutConfirmation(req, res, next) {
        var appUri = req.params.appUri || 'one-one/' + req.params.userId;

        if(!req.user) {
          req.loginToAccept = true;
          return renderAppPageWithTroupe(req, res, next, 'app-template');
        }

        var uriContext = req.uriContext;

        // If theres a troupe, theres nothing to accept
        if(uriContext.troupe) {
          return troupeService.getUrlForTroupeForUserId(uriContext.troupe, req.user.id)
            .then(function(url) {
              if(!url) throw 404;
              res.relativeRedirect(url);
            })
            .fail(next);
        }

        // If there's an invite, accept it
        if(uriContext.invite) {
          return troupeService.acceptInviteForAuthenticatedUser(req.user, uriContext.invite)
            .then(function() {
              res.relativeRedirect("/" + appUri);
            })
            .fail(next);
        }

        // Otherwise just go there
        res.relativeRedirect("/" + appUri);
      }

      app.get('/:appUri/accept/',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        uriContextResolverMiddleware,
        acceptInviteWithoutConfirmation);

      app.get('/one-one/:userId/accept/',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        preloadOneToOneTroupeMiddleware,
        acceptInviteWithoutConfirmation);

      function acceptInviteWithConfirmation(req, res) {

        var appUri = req.params.appUri || 'one-one/' + req.params.userId;
        var confirmationCode = req.params.confirmationCode;
        var login = Q.nbind(req.login, req);

        troupeService.findInviteByConfirmationCode(confirmationCode)
          .then(function(invite) {
            if(!invite) throw 404;


            if(req.user) {
              if(invite.userId == req.user.id) {
                return troupeService.acceptInviteForAuthenticatedUser(req.user, invite);
              }
              // This invite is for somebody else, log the current user out
              req.logout();
            }


            return troupeService.acceptInvite(confirmationCode, appUri)
              .then(function(result) {
                var user = result.user;

                // Now that we've accept the invite, log the new user in
                if(user) return login(user);
              });

          })
          .fail(function(err) {
            winston.error('acceptInvite failed', { exception: err });
            return null;
          })
          .then(function() {
            res.relativeRedirect("/" + appUri);
          });
      }

      app.get('/:appUri/accept/:confirmationCode',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptInviteWithConfirmation);

      app.get('/one-one/:userId/accept/:confirmationCode',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptInviteWithConfirmation);
    }
};
