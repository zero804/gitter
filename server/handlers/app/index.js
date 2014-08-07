/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var ensureLoggedIn    = require('../../web/middlewares/ensure-logged-in');
var appRender         = require('./render');
var appMiddleware     = require('./middleware');
var recentRoomService = require('../../services/recent-room-service');
var isPhone     = require('../../web/is-phone');

function saveRoom(req) {
  var userId = req.user && req.user.id;
  var troupeId = req.uriContext && req.uriContext.troupe && req.uriContext.troupe.id;

  if(userId && troupeId) {
    recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId);
  }
}

function isNewUser(user, callback) {
  return recentRoomService.findBestTroupeForUser(user)
    .then(function(room) {
      return !room;
    })
    .nodeify(callback);
}

var mainFrameMiddlewarePipeline = [
  appMiddleware.uriContextResolverMiddleware,
  appMiddleware.isPhoneMiddleware,
  function(req, res, next) {

    if (req.uriContext.ownUrl) {
      if(req.isPhone) {
        appRender.renderMobileUserHome(req, res, next, 'home');
      } else {
        isNewUser(req.user, function(err, isNew) {
          if(!err && isNew) {
            // render homepage with no left manu
            appRender.renderHomePage(req, res, next);
          } else {
            appRender.renderMainFrame(req, res, next, 'home');
          }
        });
      }
      return;
    }

    if(req.isPhone) {
      if(!req.user) {
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
  appMiddleware.uriContextResolverMiddleware,
  appMiddleware.isPhoneMiddleware,
  function (req, res, next) {
    if(!req.uriContext.troupe) return next(404);

    if(req.user) {
      saveRoom(req);
      appRender.renderChatPage(req, res, next);
    } else {
      // We're doing this so we correctly redirect a logged out
      // user to the right chat post login
      req.session.returnTo = req.url.replace(/\/~chat$/,"");
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
          ensureLoggedIn,
          appMiddleware.uriContextResolverMiddleware,
          appMiddleware.isPhoneMiddleware,
          function(req, res, next) {
            appRender.renderHomePage(req, res, next);
          });
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
      });

    }
};
