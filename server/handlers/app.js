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

var useFirebugInIE = nconf.get('web:useFirebugInIE');

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


      var login, actualTroupeName;
      if(req.user && !profileNotCompleted && troupeData) {
        login  = false;
        actualTroupeName = troupeName;

        userService.saveLastVisitedTroupeforUser(req.user.id, troupe, function(err) {
          if (err) winston.info("Something went wrong saving the user last troupe visited: ", { exception: err });
        });

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
        troupeEmailAddress: troupe.uri + '@' + troupeContext.baseServer,
        troupeContext: JSON.stringify(troupeContext),
        troupeContextData: troupeContext,
        useFirebug: useFirebug
      });

    }

  }
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
  function serializeChats(err, chatMessages) {
    if(err) return callback(err);

    var strategy = new restSerializer.ChatStrategy({ currentUserId: userId, troupeId: troupeId });
    restSerializer.serialize(chatMessages, strategy, callback);
  }

  unreadItemService.getFirstUnreadItem(userId, troupeId, 'chat', function(err, firstId, totalUnreadItems) {
    if(firstId) {
      if(totalUnreadItems > 200) {
        chatService.findChatMessagesForTroupe(troupeId, { skip: 0, limit: 20 }, serializeChats);
        return;
      }

      // No first Id, just return the most recent 20 messages
      chatService.findChatMessagesForTroupe(troupeId, { startId: firstId }, function(err, chatMessages) {
        if(err) return callback(err);

        // Just get the last 20 messages instead
        if(chatMessages.length < 20) {
          chatService.findChatMessagesForTroupe(troupeId, { skip: 0, limit: 20 }, serializeChats);
          return;
        }

        return serializeChats(err, chatMessages);

      });

      return;
    }

    // No first Id, just return the most recent 20 messages
    chatService.findChatMessagesForTroupe(troupeId, { skip: 0, limit: 20 }, serializeChats);

  });

}


function preloadTroupes(userId, callback) {
  troupeService.findAllTroupesForUser(userId, function(err, troupes) {
    if (err) return callback(err);

    var strategy = new restSerializer.TroupeStrategy({ currentUserId: userId });
    restSerializer.serialize(troupes, strategy, callback);
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

function preloadUnreadItems(userId, troupeId, callback) {
    unreadItemService.getUnreadItemsForUser(userId, troupeId, function(err, unreadItems) {
      if(err) return callback(err);
      callback(null, unreadItems);
    });
}

function preloadTroupeMiddleware(req, res, next) {
  var appUri = req.params.appUri;

  troupeService.findByUri(appUri, function(err, troupe) {
    if (err) return next({ errorCode: 500, error: err });
    if(!troupe) return next({ errorCode: 404 });
    if(troupe.status != 'ACTIVE') return next({ errorCode: 404 });
    req.troupe = troupe;

    // check if the user has access
    if(req.user && !troupeService.userHasAccessToTroupe(req.user, troupe)) {
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


      app.get('/one-one/:userId/preload',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        preloadOneToOneTroupeMiddleware,
        function(req, res, next) {
          // Timestamp aroundabout the time the snapshot was taken....
          var timestamp = new Date().toISOString();

          var f = new Fiber();
          if(req.user) {
            preloadTroupes(req.user.id, f.waitor());
            preloadFiles(req.user.id, req.troupe.id, f.waitor());
            preloadChats(req.user.id, req.troupe.id, f.waitor());
            preloadUsers(req.user.id, req.troupe, f.waitor());
            preloadUnreadItems(req.user.id, req.troupe.id, f.waitor());
          }
          f.all()
            .spread(function(troupes, files, chats, users, unreadItems) {
              // Send the information through
              res.set('Cache-Control', 'no-cache');
              res.send({
                timestamp: timestamp,
                troupes: troupes,
                files: files,
                chatMessages: chats,
                users: users,
                unreadItems: unreadItems
              });
            })
            .fail(function(err) {
              next(err);
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

      app.get('/:appUri/preload',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        //middleware.simulateDelay(10000),
        preloadTroupeMiddleware,
        function(req, res, next) {
          // Timestamp aroundabout the time the snapshot was taken....
          var timestamp = new Date().toISOString();

          var f = new Fiber();
          if(req.user) {
            preloadTroupes(req.user.id, f.waitor());
            preloadFiles(req.user.id, req.troupe.id, f.waitor());
            preloadChats(req.user.id, req.troupe.id, f.waitor());
            preloadUsers(req.user.id, req.troupe, f.waitor());
            preloadConversations(req.user.id, req.troupe, f.waitor());
            preloadUnreadItems(req.user.id, req.troupe.id, f.waitor());
          }
          f.all()
            .spread(function(troupes, files, chats, users, conversations, unreadItems) {
              // Send the information through
              res.set('Cache-Control', 'no-cache');
              res.send({
                timestamp: timestamp,
                troupes: troupes,
                files: files,
                chatMessages: chats,
                users: users,
                conversations: conversations,
                unreadItems: unreadItems
              });
            })
            .fail(function(err) {
              next(err);
            });
        });

      app.get('/:appUri',
        middleware.grantAccessForRememberMeTokenMiddleware,
        preloadTroupeMiddleware,
        function(req, res, next) {
          renderAppPageWithTroupe(req, res, next, 'app-integrated', req.troupe, req.troupe.name);
        });

      app.get('/:troupeUri/accept/:confirmationCode',
        middleware.authenticate('accept', {}),
        function(req, res/*, next*/) {
          res.relativeRedirect("/" + req.params.troupeUri);
        });

      app.get('/:appUri/chat',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        preloadTroupeMiddleware,
        function(req, res, next) {
            renderAppPageWithTroupe(req, res, next, 'mobile/chat-app', req.troupe, req.troupe.name);
        });

      app.get('/:appUri/files',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        preloadTroupeMiddleware,
        function(req, res, next) {
          renderAppPageWithTroupe(req, res, next, 'mobile/file-app', req.troupe, req.troupe.name);
        });

      app.get('/:appUri/mails',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        preloadTroupeMiddleware,
        function(req, res, next) {
          renderAppPageWithTroupe(req, res, next, 'mobile/conversation-app', req.troupe, req.troupe.name);
        });

      app.get('/:appUri/people',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        preloadTroupeMiddleware,
        function(req, res, next) {
          renderAppPageWithTroupe(req, res, next, 'mobile/people-app', req.troupe, req.troupe.name);
        });

      app.get('/:appUri/accessdenied', function(req, res) {
        res.render('app-accessdenied', {
        });
      });
    }
};