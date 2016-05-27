"use strict";

var express = require('express');
var appRender = require('./render');
var renderChat = require('./render/chat');
var appMiddleware = require('./middleware');
var recentRoomService = require('../../services/recent-room-service');
var isPhone = require('../../web/is-phone');
var timezoneMiddleware = require('../../web/middlewares/timezone');
var featureToggles = require('../../web/middlewares/feature-toggles');
var archive = require('./archive');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

function saveRoom(req) {
  var userId = req.user && req.user.id;
  var troupeId = req.uriContext && req.uriContext.troupe && req.uriContext.troupe.id;

  if(userId && troupeId) {
    recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId);
  }
}

var mainFrameMiddlewarePipeline = [
  identifyRoute('app-main-frame'),
  featureToggles,
  appMiddleware.uriContextResolverMiddleware({ create: 'not-repos' }),
  appMiddleware.isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    if (req.uriContext.ownUrl) {
      return res.redirect('/home/explore');
    }

    if(req.isPhone) {
      if(!req.user) {
        if (req.uriContext.accessDenied) {
          //return appRender.renderOrgPage(req, res, next);
          return res.redirect('/orgs/' + req.uriContext.uri + '/rooms/~iframe');
        }
        renderChat.renderMobileNotLoggedInChat(req, res, next);
        return;
      }

      saveRoom(req);
      renderChat.renderMobileChat(req, res, next);

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
  identifyRoute('app-chat-frame'),
  featureToggles,
  appMiddleware.uriContextResolverMiddleware({ create: 'not-repos'}),
  appMiddleware.isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    if (req.uriContext.accessDenied) {
      //return appRender.renderOrgPage(req, res, next);
      return res.redirect('/orgs/' + req.uriContext.uri + '/rooms/~iframe');
    }

    if(!req.uriContext.troupe) return next(404);

    if(req.user) {
      saveRoom(req);
      renderChat.renderChatPage(req, res, next);
    } else {
      // We're doing this so we correctly redirect a logged out
      // user to the right chat post login
      var url = req.originalUrl;
      req.session.returnTo = url.replace(/\/~\w+(\?.*)?$/,"");
      renderChat.renderNotLoggedInChatPage(req, res, next);
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
  identifyRoute('app-embed-frame'),
  featureToggles,
  appMiddleware.uriContextResolverMiddleware({ create: false }),
  appMiddleware.isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    if(!req.uriContext.troupe) return next(404);

    if (req.user) {
      renderChat.renderEmbeddedChat(req, res, next);
    } else {
      renderChat.renderNotLoggedInEmbeddedChat(req, res, next);
    }
  }
];

var cardMiddlewarePipeline = [
  identifyRoute('app-card-frame'),
  appMiddleware.uriContextResolverMiddleware({ create: false }),
  timezoneMiddleware,
  function (req, res, next) {
    if(!req.uriContext.troupe) return next(404);
    if(req.uriContext.troupe.security !== 'PUBLIC') return next(403);
    if(!req.query.at) return next(400);
    renderChat.renderChatCard(req, res, next);
  }
];

var router = express.Router({ caseSensitive: true, mergeParams: true });

[
  '/:roomPart1/~chat',                         // ORG or ONE_TO_ONE
  '/:roomPart1/:roomPart2/~chat',              // REPO or ORG_CHANNEL or ADHOC
  '/:roomPart1/:roomPart2/:roomPart3/~chat'    // CUSTOM REPO_ROOM
].forEach(function(path) {
  router.get(path, chatMiddlewarePipeline);
});

[
  '/:roomPart1/:roomPart2/~embed',              // REPO or ORG_CHANNEL or ADHOC
  '/:roomPart1/:roomPart2/:roomPart3/~embed'    // CUSTOM REPO_ROOM
].forEach(function(path) {
  router.get(path, embedMiddlewarePipeline);
});

[
  '/:roomPart1/:roomPart2/~card',              // REPO or ORG_CHANNEL or ADHOC
  '/:roomPart1/:roomPart2/:roomPart3/~card'    // CUSTOM REPO_ROOM
].forEach(function(path) {
  router.get(path, cardMiddlewarePipeline);
});

[
  '/:roomPart1',
  '/:roomPart1/:roomPart2',
  '/:roomPart1/:roomPart2/:roomPart3',
].forEach(function(path) {
  router.get(path + '/archives', archive.linksList);
  router.get(path + '/archives/all', archive.datesList);
  router.get(path + '/archives/:yyyy(\\d{4})/:mm(\\d{2})/:dd(\\d{2})', archive.chatArchive);
  router.get(path, mainFrameMiddlewarePipeline);
  router.post(path,
    appMiddleware.uriContextResolverMiddleware({ create: true }),
    function(req, res, next) {
      if(!req.uriContext.troupe || !req.uriContext.ownUrl) return next(404);

      // GET after POST
      res.redirect(req.uri);
    });
});

module.exports = router;
