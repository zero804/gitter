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

var mainFrameMiddlewarePipeline = [
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
      if(!req.user) {
        appRender.renderMobileNotLoggedInChat(req, res, next);
        return;
      }

      saveRoom(req);
      appRender.renderMobileApp(req, res, next);

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
      if(req.isPhone) {
        appRender.renderMobileChat(req, res, next);
      } else {
        appRender.renderChatPage(req, res, next);
      }
    } else {
      // We're doing this so we correctly redirect a logged out
      // user to the right chat post login
      req.session.returnTo = req.url.replace(/\/~chat$/,"");
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

      var archive = require('./archive');

      [
        '/:roomPart1',
        '/:roomPart1/:roomPart2',
        '/:roomPart1/:roomPart2/:roomPart3',
      ].forEach(function(path) {
        app.get(path + '/archives/all', archive.datesList);
        app.get(path + '/archives/:yyyy(\\d{4})/:mm(\\d{2})/:dd(\\d{2})', archive.chatArchive);
        app.get(path, mainFrameMiddlewarePipeline);
      });

    }
};
