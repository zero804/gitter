"use strict";

var express = require('express');
var uriContextResolverMiddleware = require('../uri-context/uri-context-resolver-middleware');
var recentRoomService = require('../../services/recent-room-service');
var isPhoneMiddleware = require('../../web/middlewares/is-phone');
var timezoneMiddleware = require('../../web/middlewares/timezone');
var featureToggles = require('../../web/middlewares/feature-toggles');
var archive = require('./archive');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var redirectErrorMiddleware = require('../uri-context/redirect-error-middleware');
var topicRouter = require('./topics');
var selectRenderer = require('./select-renderer');
var desktopRenderer = require('../renderers/desktop-renderer');
var embedRenderer = require('../renderers/embed-renderer');
var cardRenderer = require('../renderers/card-renderer');

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
  uriContextResolverMiddleware,
  isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    var uriContext = req.uriContext;

    if (uriContext.ownUrl) {
      return res.redirect('/home/explore');
    }

    var renderer = selectRenderer(req);

    if (!renderer.hasSecondaryView()) {
      // If a child frame is going to be loaded (aka the secondary view)
      // Then we should wait for that frame to load before saving the state
      saveRoom(req);
    }

    return renderer.renderPrimaryView(req, res, next, {
      uriContext: uriContext
    });
  },
  redirectErrorMiddleware
];

var frameMiddlewarePipeline = [
  identifyRoute('app-chat-frame'), // Legacy name
  featureToggles,
  uriContextResolverMiddleware,
  isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    saveRoom(req);

    return desktopRenderer.renderSecondaryView(req, res, next, {
      uriContext: req.uriContext
    });

  },
  redirectErrorMiddleware
];

var embedMiddlewarePipeline = [
  identifyRoute('app-embed-frame'),
  featureToggles,
  uriContextResolverMiddleware,
  isPhoneMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    return embedRenderer.renderSecondaryView(req, res, next, {
      uriContext: req.uriContext
    })
  },
  redirectErrorMiddleware
];

var cardMiddlewarePipeline = [
  identifyRoute('app-card-frame'),
  uriContextResolverMiddleware,
  timezoneMiddleware,
  function (req, res, next) {
    return cardRenderer.renderSecondaryView(req, res, next, {
      uriContext: req.uriContext
    });
  },
  redirectErrorMiddleware
];

var router = express.Router({ caseSensitive: true, mergeParams: true });

// Topics
// TODO: Fix this and make it use the uriContext
router.use('/:groupUri/topics', topicRouter);

[
  '/:roomPart1',
  '/:roomPart1/:roomPart2',
  '/:roomPart1/:roomPart2/:roomPart3',
].forEach(function(path) {
  router.get(path + '/archives', archive.linksList);
  router.get(path + '/archives/all', archive.datesList);
  router.get(path + '/archives/:yyyy(\\d{4})/:mm(\\d{2})/:dd(\\d{2})', archive.chatArchive);

  // Secondary view
  router.get(path + '/~(chat|iframe)', frameMiddlewarePipeline);

  // Twitter Card
  router.get(path + '/~card', cardMiddlewarePipeline);

  // Embedded View
  router.get(path + '/~embed', embedMiddlewarePipeline);

  // Primary View
  router.get(path, mainFrameMiddlewarePipeline);
});


module.exports = router;
