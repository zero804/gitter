/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var ensureLoggedIn     = require('../../web/middlewares/ensure-logged-in');
var appRender          = require('./render');
var appMiddleware      = require('./middleware');
var recentRoomService  = require('../../services/recent-room-service');
var isPhone            = require('../../web/is-phone');
var timezoneMiddleware = require('../../web/middlewares/timezone');

function saveRoom(req) {
  var userId = req.user && req.user.id;
  var troupeId = req.uriContext && req.uriContext.troupe && req.uriContext.troupe.id;

  if(userId && troupeId) {
    recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId);
  }
}

var mainFrameMiddlewarePipeline = [
  appMiddleware.uriContextResolverMiddleware({ create: 'not-repos' }),
  appMiddleware.isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {

    if (req.uriContext.ownUrl) {
      return res.redirect('/home');
    }

    if(req.isPhone) {
      if(!req.user) {
        if (req.uriContext.accessDenied) {
          return appRender.renderOrg404Page(req, res, next);
        }
        appRender.renderMobileNotLoggedInChat(req, res, next);
        return;
      }

      saveRoom(req);
      appRender.renderMobileChat(req, res, next);

    } else {
      appRender.renderMainFrame(req, res, next, 'chat');
    }
  },
  function (err, req, res, next) {
    if (err && err.userNotSignedUp && !isPhone(req.headers['user-agent'])) {
      appRender.renderUserNotSignedUpMainFrame(req, res, next, 'chat');
      return;
    }
    return next(err);
  }
];

var chatMiddlewarePipeline = [
  appMiddleware.uriContextResolverMiddleware({ create: 'not-repos'}),
  appMiddleware.isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {

    if (req.uriContext.accessDenied) {
      return appRender.renderOrg404Page(req, res, next);
    }

    if(!req.uriContext.troupe) return next(404);

    if(req.user) {
      saveRoom(req);
      appRender.renderChatPage(req, res, next);
    } else {
      // We're doing this so we correctly redirect a logged out
      // user to the right chat post login
      req.session.returnTo = req.url.replace(/\/~\w+(\?.*)?$/,"");
      appRender.renderNotLoggedInChatPage(req, res, next);
    }

  },
  function (err, req, res, next) {
    if (err && err.userNotSignedUp) {
      appRender.renderUserNotSignedUp(req, res, next);
      return;
    }
    return next(err);
  }
];

var embedMiddlewarePipeline = [
  appMiddleware.uriContextResolverMiddleware({ create: false }),
  appMiddleware.isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    if(!req.uriContext.troupe) return next(404);
    appRender.renderEmbeddedChat(req, res, next);
  }
];

var cardMiddlewarePipeline = [
  appMiddleware.uriContextResolverMiddleware({ create: false }),
  timezoneMiddleware,
  function (req, res, next) {
    if(!req.uriContext.troupe) return next(404);
    if(req.uriContext.troupe.security !== 'PUBLIC') return next(403);
    if(!req.query.at) return next(400);
    appRender.renderChatCard(req, res, next);
  }
];


module.exports = {
    install: function(app) {

      [
        '/:roomPart1/~chat',                         // ORG or ONE_TO_ONE
        '/:roomPart1/:roomPart2/~chat',              // REPO or ORG_CHANNEL or ADHOC
        '/:roomPart1/:roomPart2/:roomPart3/~chat'    // CUSTOM REPO_ROOM
      ].forEach(function(path) {
        app.get(path, chatMiddlewarePipeline);
      });

      [
        '/:roomPart1/:roomPart2/~embed',              // REPO or ORG_CHANNEL or ADHOC
        '/:roomPart1/:roomPart2/:roomPart3/~embed'    // CUSTOM REPO_ROOM
      ].forEach(function(path) {
        app.get(path, embedMiddlewarePipeline);
      });

      [
        '/:roomPart1/:roomPart2/~card',              // REPO or ORG_CHANNEL or ADHOC
        '/:roomPart1/:roomPart2/:roomPart3/~card'    // CUSTOM REPO_ROOM
      ].forEach(function(path) {
        app.get(path, cardMiddlewarePipeline);
      });

      app.get('/home/~home',
        ensureLoggedIn,
        appMiddleware.isPhoneMiddleware,
        function(req, res, next) {
          appRender.renderHomePage(req, res, next);
        });

      require('./integrations').install(app);
      require('./mobile').install(app);

      var archive = require('./archive');

      [
        '/:roomPart1',
        '/:roomPart1/:roomPart2',
        '/:roomPart1/:roomPart2/:roomPart3',
      ].forEach(function(path) {
        app.get(path + '/archives/all', archive.datesList);
        app.get(path + '/archives/:yyyy(\\d{4})/:mm(\\d{2})/:dd(\\d{2})', archive.chatArchive);
        app.get(path, mainFrameMiddlewarePipeline);
        app.post(path,
          appMiddleware.uriContextResolverMiddleware({ create: true }),
          function(req, res, next) {
            if(!req.uriContext.troupe || !req.uriContext.ownUrl) return next(404);

            // GET after POST
            res.redirect(req.uri);
          });
      });

    }
};
