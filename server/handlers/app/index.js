"use strict";

var env = require('gitter-web-env');
var logger = env.logger;
var express = require('express');
var mainFrameRenderer = require('../renderers/main-frame');
var chatRenderer = require('../renderers/chat');
var userNotSignedUpRenderer = require('../renderers/user-not-signed-up');
var uriContextResolverMiddleware = require('../uri-context/uri-context-resolver-middleware');
var recentRoomService = require('../../services/recent-room-service');
var isPhoneMiddleware = require('../../web/middlewares/is-phone');
var timezoneMiddleware = require('../../web/middlewares/timezone');
var featureToggles = require('../../web/middlewares/feature-toggles');
var archive = require('./archive');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var StatusError = require('statuserror');
var fixMongoIdQueryParam = require('../../web/fix-mongo-id-query-param');
var url = require('url');
var social = require('../social-metadata');
var chatService = require('../../services/chat-service');
var restSerializer = require("../../serializers/rest-serializer");

function saveRoom(req) {
  var userId = req.user && req.user.id;
  var troupeId = req.uriContext && req.uriContext.troupe && req.uriContext.troupe.id;

  if(userId && troupeId) {
    recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId);
  }
}

function getSocialMetaDataForRoom(room, aroundId) {
    // TODO: change this to use policy
    if (aroundId && room && room.security === 'PUBLIC') {
      // If this is a permalinked chat, load special social meta-data....
      return chatService.findByIdInRoom(room._id, aroundId)
        .then(function(chat) {
          var strategy = new restSerializer.ChatStrategy({
            notLoggedIn: true,
            troupeId: room._id
          });

          return restSerializer.serializeObject(chat, strategy);
        })
        .then(function(permalinkChatSerialized) {
          return social.getMetadataForChatPermalink({ room: room, chat: permalinkChatSerialized });
        });
    }

    return social.getMetadata({ room: room });
}

var mainFrameMiddlewarePipeline = [
  identifyRoute('app-main-frame'),
  featureToggles,
  uriContextResolverMiddleware,
  isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    if (req.uriContext.ownUrl) {
      return res.redirect('/home/explore');
    }

    if(req.isPhone) {
      if(!req.user) {
        if (req.uriContext.accessDenied) {
          return res.redirect('/orgs/' + req.uriContext.uri + '/rooms/~iframe');
        }

        chatRenderer.renderMobileNotLoggedInChat(req, res, next);
        return;
      }

      saveRoom(req);
      chatRenderer.renderMobileChat(req, res, next);

    } else {
      // Load the main-frame
      var chatAppQuery = {};
      var aroundId = fixMongoIdQueryParam(req.query.at);

      if (aroundId) { chatAppQuery.at = aroundId; }

      var subFrameLocation = url.format({
        pathname: '/' + req.uriContext.uri + '/~chat',
        query:    chatAppQuery,
        hash:     '#initial'
      });

      var socialMetaDataPromise = getSocialMetaDataForRoom(req.troupe, aroundId);

      mainFrameRenderer.renderMainFrame(req, res, next, {
        subFrameLocation: subFrameLocation,
        title: req.uriContext.uri,
        socialMetaDataPromise: socialMetaDataPromise
      });
    }
  },
  function (err, req, res, next) {
    // TODO: this is probably not being used any more
    if (err && err.userNotSignedUp && !req.isPhone) {
      // TODO This page is in need of some serious love
      userNotSignedUpRenderer.renderUserNotSignedUpMainFrame(req, res, next);
      return;
    }
    return next(err);
  }
];

var chatMiddlewarePipeline = [
  identifyRoute('app-chat-frame'),
  featureToggles,
  uriContextResolverMiddleware,
  isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    if (req.uriContext.accessDenied) {
      return res.redirect('/orgs/' + req.uriContext.uri + '/rooms/~iframe');
    }

    if(!req.uriContext.troupe) return next(new StatusError(404));

    if(req.user) {
      saveRoom(req);
      chatRenderer.renderChatPage(req, res, next);
    } else {
      // We're doing this so we correctly redirect a logged out
      // user to the right chat post login
      var url = req.originalUrl;
      req.session.returnTo = url.replace(/\/~\w+(\?.*)?$/,"");
      chatRenderer.renderNotLoggedInChatPage(req, res, next);
    }

  },
  function (err, req, res, next) {
    if (err && err.userNotSignedUp) {
      userNotSignedUpRenderer.renderUserNotSignedUp(req, res, next);
      return;
    }
    return next(err);
  }
];

var embedMiddlewarePipeline = [
  identifyRoute('app-embed-frame'),
  featureToggles,
  uriContextResolverMiddleware,
  isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    if(!req.uriContext.troupe) return next(new StatusError(404));

    if (req.user) {
      chatRenderer.renderEmbeddedChat(req, res, next);
    } else {
      chatRenderer.renderNotLoggedInEmbeddedChat(req, res, next);
    }
  }
];

var cardMiddlewarePipeline = [
  identifyRoute('app-card-frame'),
  uriContextResolverMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    if(!req.uriContext.troupe) return next(new StatusError(404));
    if(req.uriContext.troupe.security !== 'PUBLIC') return next(new StatusError(403));
    if(!req.query.at) return next(new StatusError(400));
    chatRenderer.renderChatCard(req, res, next);
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

  // Why would somebody be posting to a room
  // TODO: This should probably be removed
  router.post(path,
    uriContextResolverMiddleware,
    function(req, res, next) {
      logger.warn('POST to room', { path: req.originalUrl, userId: req.user && req.user.id });

      if(!req.uriContext.troupe || !req.uriContext.ownUrl) return next(new StatusError(404));

      // GET after POST
      res.redirect(req.uri);
    });
});

module.exports = router;
