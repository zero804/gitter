/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware        = require('../../web/middleware');
var appRender         = require('./render');
var appMiddleware     = require('./middleware');
var recentRoomService = require('../../services/recent-room-service');

function saveRoom(req) {
  var userId = req.user && req.user.id;
  var troupeId = req.uriContext && req.uriContext.troupe && req.uriContext.troupe.id;

  if(userId && troupeId) {
    recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId);
  }
}

var chatFrameMiddlewarePipeline = [
  // middleware.ensureLoggedIn(),
  appMiddleware.uriContextResolverMiddleware,
  appMiddleware.isPhoneMiddleware,
  function(req, res, next) {

    if (req.uriContext.ownUrl) {
      if(req.isPhone) {
        appRender.renderMobileUserHome(req, res, next, 'home');
      } else {
        appRender.renderMainFrame(req, res, next, 'home');
      }
      return;
    }

    if(req.isPhone) {
      if(req.user) {
        saveRoom(req);
        appRender.renderMobileChat(req, res, next);
      } else {
        // TODO: XXX: deal with not logged in on this platform
      }
    } else {
      appRender.renderMainFrame(req, res, next, 'chat');
    }
  }
];

var chatMiddlewarePipeline = [
  // middleware.ensureLoggedIn(),
  appMiddleware.uriContextResolverMiddleware,
  appMiddleware.isPhoneMiddleware,
  function(req, res, next) {
    if(req.user) {
      saveRoom(req);
      appRender.renderChatPage(req, res, next);
    } else {
      appRender.renderNotLoggedInChatPage(req, res, next);
    }

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
        '/:roomPart1/~home'
      ].forEach(function(path) {
        app.get(path,
          middleware.ensureLoggedIn(),
          appMiddleware.uriContextResolverMiddleware,
          appMiddleware.isPhoneMiddleware,
          function(req, res, next) {
            appRender.renderHomePage(req, res, next);
          });
      });

      require('./integrations').install(app);

      [
        '/:roomPart1',
        '/:roomPart1/:roomPart2',
        '/:roomPart1/:roomPart2/:roomPart3',
      ].forEach(function(path) {
        app.get(path, chatFrameMiddlewarePipeline);
      });
    }
};
