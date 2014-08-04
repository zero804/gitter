/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";
var nconf             = require('../../utils/config');
var Q                 = require('q');
var contextGenerator  = require('../../web/context-generator');
var restful           = require('../../services/restful');
var UserService       = require('../../services/user-service');
var appVersion        = require('../../web/appVersion');
var burstCalculator   = require('../../utils/burst-calculator');
var _                 = require('underscore');

/* How many chats to send back */
var INITIAL_CHAT_COUNT = 50;

var stagingText, stagingLink;

/* App tag */
var staging = nconf.get('STAGING');
switch(nconf.get('NODE_ENV')) {
  case 'prod':
    if(staging) {
      stagingText = 'NEXT';
      stagingLink = 'http://next.gitter.im';
    }
    break;
  case 'beta':
    var branch = appVersion.getBranch();
    stagingText = branch ? branch.split('/').pop() : 'BETA';
    stagingLink = appVersion.getGithubLink();
    break;
  case 'dev':
    stagingText = 'DEV';
    stagingLink = 'https://github.com/troupe/gitter-webapp/tree/develop';
    break;
}

function getAppCache(req) {
  if(!nconf.get('web:useAppCache')) return;
  return req.url + '.appcache';
}

function renderHomePage(req, res, next) {
  contextGenerator.generateNonChatContext(req)
    .then(function (troupeContext) {
      var page, bootScriptName;

      if(req.isPhone) {
        page = 'mobile/mobile-app';
        bootScriptName = 'mobile-userhome';
      } else {
        page = 'userhome-template';
        bootScriptName = 'userhome';
      }

      res.render(page, {
        useAppCache: !!nconf.get('web:useAppCache'),
        bootScriptName: bootScriptName,
        troupeName: req.uriContext.uri,
        troupeContext: troupeContext,
        agent: req.headers['user-agent'],
        isUserhome: true,
      });
    })
    .fail(next);
}

function renderMainFrame(req, res, next, frame) {
  contextGenerator.generateNonChatContext(req)
    .then(function (troupeContext) {
      var chatAppLocation = '/' + req.uriContext.uri + '/~' + frame + '#initial';

      var template, bootScriptName;
      if(req.user) {
        template = 'app-template';
        bootScriptName = 'router-app';
      } else {
        template = 'app-nli-template';
        bootScriptName = 'router-nli-app';
      }

      res.render(template, {
        appCache: getAppCache(req),
        bootScriptName: bootScriptName,
        troupeName: req.uriContext.uri,
        troupeContext: troupeContext,
        chatAppLocation: chatAppLocation,
        agent: req.headers['user-agent'],
        stagingText: stagingText,
        stagingLink: stagingLink,
      });
    })
    .fail(next);
}

function renderChat(req, res, template, script, next) {
  var troupe = req.uriContext.troupe;
  var userId = req.user && req.user.id;
  var aroundId = req.query.at;

  var snapshotOptions = { limit: INITIAL_CHAT_COUNT, aroundId: aroundId };

  Q.all([
    contextGenerator.generateTroupeContext(req, { snapshots: { chat: snapshotOptions } }),
    restful.serializeChatsForTroupe(troupe.id, userId, snapshotOptions)
    ]).spread(function (troupeContext, chats) {
      var initialChat = _.find(chats, function(chat) { return chat.initial; });
      var initialBottom = !initialChat;
      var githubLink;

      if(troupe.githubType === 'REPO' || troupe.githubType === 'ORG') {
        githubLink = 'https://github.com/' + req.uriContext.uri;
      }

      res.render(template, {
        isRepo: troupe.githubType === 'REPO',
        appCache: getAppCache(req),
        bootScriptName: script,
        githubLink: githubLink,
        troupeName: req.uriContext.uri,
        troupeTopic: troupeContext.troupe.topic,
        oneToOne: troupe.oneToOne,
        troupeFavourite: troupeContext.troupe.favourite,
        user: troupeContext.user,
        troupeContext: troupeContext,
        initialBottom: initialBottom,
        chats: burstCalculator(chats),
        agent: req.headers['user-agent'],
      });

    })
    .fail(next);
}

function renderChatPage(req, res, next) {
  return renderChat(req, res, 'chat-template', 'router-chat', next);
}

function renderMobileUserHome(req, res, next) {
  contextGenerator.generateNonChatContext(req)
    .then(function(troupeContext) {
      res.render('mobile/mobile-app', {
        useAppCache: !!nconf.get('web:useAppCache'),
        bootScriptName: 'mobile-userhome',
        troupeName: req.uriContext.uri,
        troupeContext: troupeContext,
        agent: req.headers['user-agent'],
        isUserhome: true,
      });
    })
    .fail(next);
}

function renderMobileChat(req, res, next) {
  return renderChat(req, res, 'mobile/mobile-chat', 'mobile-app', next);
}

function renderMobileNativeChat(req, res) {
  /*
   * All native chats are served from one endpoint so we can appcache one page.
   *
   * This means:
   * 1. server has no idea what the troupe id is
   * 2. the embedded troupe context must be minimal as the appcache would make it permanent
   *
   * Therefore creating a troupe context is the responibility of the client browser.
   */
  res.render('mobile/native-chat-app', {
    appCache: getAppCache(req),
    troupeContext: {
      userId: req.user.id
    }
  });
}

function renderMobileNativeUserhome(req, res) {
  /*
   * Native userhome is served with an appcache.
   *
   * This means the embedded troupe context must be minimal as the appcache would make it permanent
   *
   * Therefore creating a troupe context is the responibility of the client browser.
   */
  res.render('mobile/native-userhome-app', {
    appCache: getAppCache(req),
    bootScriptName: 'mobile-native-userhome',
    troupeContext: {
      userId: req.user.id
    }
  });
}

function renderMobileNotLoggedInChat(req, res, next) {
  return renderChat(req, res, 'mobile/mobile-app', 'mobile-nli-app', next);
}


function renderNotLoggedInChatPage(req, res, next) {
  return renderChat(req, res, 'chat-nli-template', 'router-nli-chat', next);
}

/**
 * renderUserNotSignedUp() renders a set template for a 1:1 chat, with an invited user.
 */
function renderUserNotSignedUp(req, res, next) {
  UserService.findByUsername(req.params.roomPart1)
    .then(function (user) {
      res.render('chat-invited-template', {
        appCache: getAppCache(req),
        agent: req.headers['user-agent'],
        oneToOneInvited: true,
        invitedUser: user,
        troupeName: user.username,
        shareURL: nconf.get('web:basepath') + '/' + req.user.username
      });
    })
    .fail(next);
}

function renderUserNotSignedUpMainFrame(req, res, next, frame) {
  contextGenerator.generateNonChatContext(req)
    .then(function(troupeContext) {
      var chatAppLocation = '/' + req.params.roomPart1 + '/~' + frame + '#initial';

      var template, bootScriptName;
      if(req.user) {
        template = 'app-template';
        bootScriptName = 'router-app';
      } else {
        template = 'app-nli-template';
        bootScriptName = 'router-nli-app';
      }

      res.render(template, {
        appCache: getAppCache(req),
        bootScriptName: bootScriptName,
        troupeName: req.params.roomPart1,
        troupeContext: troupeContext,
        chatAppLocation: chatAppLocation,
        agent: req.headers['user-agent'],
        stagingText: stagingText,
        stagingLink: stagingLink,
      });
    }).fail(next);
}


module.exports = exports = {
  renderHomePage: renderHomePage,
  renderChatPage: renderChatPage,
  renderMainFrame: renderMainFrame,
  renderMobileChat: renderMobileChat,
  renderMobileUserHome: renderMobileUserHome,
  renderMobileNotLoggedInChat: renderMobileNotLoggedInChat,
  renderNotLoggedInChatPage: renderNotLoggedInChatPage,
  renderMobileNativeChat: renderMobileNativeChat,
  renderMobileNativeUserhome: renderMobileNativeUserhome,
  renderUserNotSignedUp: renderUserNotSignedUp,
  renderUserNotSignedUpMainFrame: renderUserNotSignedUpMainFrame
};
