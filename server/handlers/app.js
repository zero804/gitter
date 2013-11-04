/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var _ = require("underscore");
var winston = require("winston");
var troupeService = require("../services/troupe-service");
var nconf = require('../utils/config');
var middleware = require('../web/middleware');
var middleware = require('../web/middleware');
var appVersion = require("../web/appVersion");
var loginUtils = require('../web/login-utils');
var uriService = require('../services/uri-service');
var unreadItemService = require('../services/unread-item-service');
var request = require('request');

var Q = require('q');
var isPhone = require('../web/is-phone');
var contextGenerator = require('../web/context-generator');

function renderHomePage(req, res, next) {
  contextGenerator.generateMiniContext(req, function(err, troupeContext) {
    if(err) {
      next(err);
    } else {
      if(req.isPhone) {
        renderMobileUserhome(req, res, troupeContext);
      } else {
        renderDesktopUserhome(req, res, troupeContext);
      }
    }
  });
}

function renderDesktopUserhome(req, res, troupeContext) {
  var user = req.user;

  res.render('app-template', {
    useAppCache: !!nconf.get('web:useAppCache'),
    bootScriptName: user ? 'router-homepage' : 'router-login',
    troupeName: (req.user && req.user.displayName) || '',
    troupeContext: troupeContext,
    agent: req.headers['user-agent']
  });
}

function renderMobileUserhome(req, res, troupeContext) {
  var user = req.user;

  res.render('mobile/mobile-app', {
    useAppCache: !!nconf.get('web:useAppCache'),
    bootScriptName: 'mobile-userhome',
    troupeName: (user && user.displayName) || '',
    troupeContext: troupeContext,
    isUserhome: true
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
      if(login) {
        bootScript = 'router-login';
      } else {
        bootScript = req.isPhone ? 'mobile-app' : 'router-app';
      }

      res.render(page, {
        appCache: getAppCache(req),
        login: login,
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

      app.get('/:appUri/integrations',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        function (req, res) {
          request.get({
            url: 'http://localhost:3000/troupes/'+req.troupe._id+'/hooks',
            json: true
          }, function(err, resp, hooks) {
            res.render('integrations', {
              hooks: hooks,
              troupe: req.troupe,
              services: ['github', 'bitbucket']
            });
          });
        });

      app.del('/:appUri/integrations',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        function (req, res) {
          request.del({
            url: 'http://localhost:3000/troupes/'+req.troupe._id+'/hooks/'+req.body.id,
            json: true
          },
          function() {
            res.redirect('/'+req.troupe.uri+'/integrations');
          });
        });

      app.post('/:appUri/integrations',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        function(req, res) {
          request.post({
            url: 'http://localhost:3000/troupes/'+req.troupe._id+'/hooks',
            json: {
              service: req.body.service,
              returnTo: 'http://localhost:5000'+req.url
            }
          },
          function(err, resp, body) {
            res.redirect(body.configurationURL);
          });
        });

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
              return troupeService.acceptInviteForAuthenticatedUser(req.user, invite);
            }
            else {
              // we (must and) have given the user an opportunity to login before coming to this handler
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

      // show a prompt dialog to either login or create a new account
      function acceptInvitePrompt(req, res, next) {

        // Note: if the invite is already associated with an account then just skip this prompt,
        // and either the login or signup will work the same. This is not required currently
        // because the user is given the invite url without the confirm code if they are an existing user.

        if (req.user) {
          return acceptInviteWithConfirmation(req, res); // invite is accepted immediately
        }

        contextGenerator.generateMiniContext(req, function(err, troupeContext) {
          if(err) {
            next(err);
          } else {
            res.render('app-template', {
              useAppCache: !!nconf.get('web:useAppCache'),
              bootScriptName: 'router-login',
              troupeName: 'Invite',
              troupeContext: _.extend(troupeContext, {
                acceptInvitePrompt: true
              }),
              agent: req.headers['user-agent']
            });
          }
        });
      }

      // will require the user is logged in, who will then inherit the invite
      app.get('/:appUri/accept/:confirmationCode/login',
        middleware.ensureLoggedIn(),
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptInviteWithConfirmation);

      // will create a new account for the invite (or login the user it already belongs to)
      app.get('/:appUri/accept/:confirmationCode/signup',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptInviteWithConfirmation);

      // prompt whether the user wants to login to accept invite or create a new account
      app.get('/:appUri/accept/:confirmationCode',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptInvitePrompt);

      /* one to one accept */

      app.get('/one-one/:userId/accept/:confirmationCode/login',
        middleware.ensureLoggedIn(),
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptInviteWithConfirmation);

      app.get('/one-one/:userId/accept/:confirmationCode/signup',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptInviteWithConfirmation);

      app.get('/one-one/:userId/accept/:confirmationCode',
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        acceptInvitePrompt);
    }
};
