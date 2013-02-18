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
var middleware = require('../web/middleware');
var fileService = require("../services/file-service");
var chatService = require("../services/chat-service");
var Fiber = require("../utils/fiber");
var conversationService = require("../services/conversation-service");
var appVersion = require("../web/appVersion");

function renderAppPageWithTroupe(req, res, next, page, troupe, troupeName, data) {
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

    var troupeStrategy = new restSerializer.TroupeStrategy({ currentUserId: (req.user) ? req.user.id : null, mapUsers: true });

    restSerializer.serialize(troupe, troupeStrategy, function(err, troupeData) {
      if(err) return next(err);

      var accessDenied;

      if(req.user) {
        if(!troupeService.userHasAccessToTroupe(req.user, troupe)) {
          accessDenied = true;
          troupeData = null;
        }

        var status = req.user.status;
        profileNotCompleted = status == 'PROFILE_NOT_COMPLETED';
        if(status != 'PROFILE_NOT_COMPLETED' && status != 'ACTIVE') {
          // Oh dear, something has gone horribly wrong
          winston.error("Rejecting user. Something has gone wrong! ", { user: req.user });
          return next("Inconsistent state for user: " + status);
        }

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
          appVersion: appVersion.getCurrentVersion(),
          baseServer: nconf.get('web:baseserver'),
          basePort: nconf.get('web:baseport'),
          basePath: nconf.get('web:basepath'),
          homeUrl: nconf.get('web:homeurl'),
          websockets: {
            fayeUrl: getFayeUrl(),
            options: {
              timeout: 120,
              retry: 5
            },
            disable: ['websocket']
          }


      };


      var login, actualTroupeName;
      if(req.user && !profileNotCompleted && troupeData) {
        login  = false;
        actualTroupeName = troupeName;

        if (!troupe.oneToOne) {
          userService.saveLastVisitedTroupeforUser(req.user.id, troupe.id, function(err) {
            if (err) winston.info("Something went wrong saving the user last troupe visited: ", { exception: err });
          });
        }
      } else {
        login = true;
        if(profileNotCompleted) {
          actualTroupeName = troupeName;
        } else {
          actualTroupeName = "Welcome";
        }
      }

      res.render(page, {
        useAppCache: !!nconf.get('web:useAppCache'),
        login: login,
        data: login ? null : JSON.stringify(data), // Only push the data through if the user is logged in already
        troupeName: actualTroupeName,
        troupeContext: JSON.stringify(troupeContext)
      });

    });

  }
}

function renderAppPage(req, res, next, page) {
  var appUri = req.params.appUri;

  troupeService.findByUri(appUri, function(err, troupe) {
    if(err) return next(err);
    if(!troupe) return next("Troupe: " + appUri + " not found.");

    renderAppPageWithTroupe(req, res, next, page, troupe, troupe.name);
  });
}

function preloadFiles(userId, troupeId, callback) {
  fileService.findByTroupe(troupeId, function(err, files) {
    if (err) {
      winston.error("Error in findByTroupe: ", { exception: err });
      return callback(err);
    }

    var strategy = new restSerializer.FileStrategy({ currentUserId: userId, troupeId: troupeId });
    restSerializer.serialize(files, strategy, callback);
  });
}

function preloadChats(userId, troupeId, callback) {
  chatService.findChatMessagesForTroupe(troupeId, { skip: 0, limit: 50 }, function(err, chatMessages) {
    if(err) return callback(err);

    var strategy = new restSerializer.ChatStrategy({ currentUserId: userId, troupeId: troupeId });
    restSerializer.serialize(chatMessages, strategy, callback);
  });

}

function preloadUsers(userId, troupe, callback) {
  var strategy = new restSerializer.UserIdStrategy( { showPresenceForTroupeId: troupe.id });
  restSerializer.serialize(troupe.getUserIds(), strategy, callback);
}


function preloadConversations(userId, troupeId, callback) {
  conversationService.findByTroupe(troupeId, function(err, conversations) {
    if(err) return callback(err);

    restSerializer.serialize(conversations, new restSerializer.ConversationMinStrategy(), callback);
  });
}

function preloadTroupeMiddleware(req, res, next) {
  var appUri = req.params.appUri;

  troupeService.findByUri(appUri, function(err, troupe) {
    if (err) return next({ errorCode: 500, error: err });
    if(!troupe) return next({ errorCode: 404 });
    req.troupe = troupe;
    next();
  });

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

      app.get('/one-one/:userId',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          troupeService.findOrCreateOneToOneTroupe(req.user.id, req.params.userId, function(err, troupe, otherUser) {
            if(err) return next(err);


            var f = new Fiber();
            preloadFiles(req.user.id, troupe.id, f.waitor());
            preloadChats(req.user.id, troupe.id, f.waitor());
            preloadUsers(req.user.id, troupe, f.waitor());

            f.all()
              .spread(function(files, chats, users) {
                // Send the information through
                renderAppPageWithTroupe(req, res, next, 'app-integrated', troupe, otherUser.displayName, {
                  files: files,
                  chatMessages: chats,
                  users: users,
                  otherUser: otherUser
                });
              })
              .fail(function(err) {
                next(err);
              });


          });

        }
      );

      app.get('/version', function(req, res, next) {
        res.json({ appVersion: appVersion.getCurrentVersion() });
      });

      app.get('/:appUri',
        middleware.grantAccessForRememberMeTokenMiddleware,
        preloadTroupeMiddleware,
        function(req, res, next) {
        var page;
        if(req.headers['user-agent'].indexOf('Mobile') >= 0) {
          page = 'app-mobile';
        } else {
          page = 'app-integrated';
        }

        var f = new Fiber();
        if(req.user) {
          preloadFiles(req.user.id, req.troupe.id, f.waitor());
          preloadChats(req.user.id, req.troupe.id, f.waitor());
          preloadUsers(req.user.id, req.troupe, f.waitor());
          preloadConversations(req.user.id, req.troupe, f.waitor());
        }
        f.all()
          .spread(function(files, chats, users, conversations) {
            // Send the information through
            renderAppPageWithTroupe(req, res, next, page, req.troupe, req.troupe.name, {
              files: files,
              chatMessages: chats,
              users: users,
              conversations: conversations
            });
          })
          .fail(function(err) {
            next(err);
          });

      });


      app.get('/last/:page',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        function(req, res, next) {

          function findDefaultTroupeForUser() {
            userService.findDefaultTroupeForUser(req.user.id, function (err,troupe) {
              if (err || !troupe) {
                next(500);
              }

              res.redirect('/' + troupe.uri + "/" + req.params.page);
            });
          }

          if (req.user.lastTroupe) {
            troupeService.findById(req.user.lastTroupe, function (err,troupe) {
              if (err || !troupe || !troupeService.userHasAccessToTroupe(req.user, troupe)) {
                findDefaultTroupeForUser();
                return;
              }

              res.redirect('/' + troupe.uri + "/" + req.params.page);
            });
          } else {
            findDefaultTroupeForUser();
          }
        });

      app.get('/:appUri/chat',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        preloadTroupeMiddleware,
        function(req, res, next) {

          preloadChats(req.user.id, req.troupe.id, function(err, serialized) {
            if (err) {
              winston.error("Error in Serializer:", { exception: err });
              return next(err);
            }

            renderAppPageWithTroupe(req, res, next, 'mobile/chat-app', req.troupe, req.troupe.name, { 'chatMessages': serialized });
          });

        });

      app.get('/:appUri/files',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        preloadTroupeMiddleware,
        function(req, res, next) {

          preloadFiles(req.user.id, req.troupe.id, function(err, serializedFiles) {
            if (err) {
              winston.error("Error in Serializer:", { exception: err });
              return next(err);
            }

            renderAppPageWithTroupe(req, res, next, 'mobile/file-app', req.troupe, req.troupe.name, { 'files': serializedFiles });
          });

        });

      app.get('/:appUri/mails',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          renderAppPage(req, res, next, 'mobile/conversation-app');
        });

      app.get('/:appUri/people',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          renderAppPage(req, res, next, 'mobile/people-app');
        });

      app.get('/:appUri/accessdenied', function(req, res) {
        res.render('app-accessdenied', {
        });
      });
    }
};