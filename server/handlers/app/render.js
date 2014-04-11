/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf             = require('../../utils/config');
var Q                 = require('q');
var contextGenerator  = require('../../web/context-generator');
var restful           = require('../../services/restful');

/* How many chats to send back */
var INITIAL_CHAT_COUNT = 20;

function getAppCache(req) {
  if(!nconf.get('web:useAppCache')) return;
  return req.url + '.appcache';
}

function renderHomePage(req, res, next) {
  contextGenerator.generateMiniContext(req, function(err, troupeContext) {
    if(err) return next(err);

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
      isUserhome: true
    });
  });
}


function renderMainFrame(req, res, next, frame) {
  contextGenerator.generateMiniContext(req)
    .then(function(troupeContext) {
      var chatAppLocation = '/' + req.uriContext.uri + '/~' + frame + '#initial';

      res.render('app-template', {
        appCache: getAppCache(req),
        bootScriptName: 'router-app',
        troupeName: req.uriContext.uri,
        troupeContext: troupeContext,
        chatAppLocation: chatAppLocation,
        agent: req.headers['user-agent']
      });
    })
    .fail(next);
}

function renderChatPage(req, res, next) {
  var troupe = req.uriContext.troupe;
  var userId = req.user && req.user.id;

  Q.all([
    contextGenerator.generateTroupeContext(req),
    restful.serializeChatsForTroupe(troupe.id, userId, { limit: INITIAL_CHAT_COUNT })
    ]).spread(function(troupeContext, chats) {

      var githubLink;

      if(troupe.githubType === 'REPO' || troupe.githubType === 'ORG') {
        githubLink = 'https://github.com/' + req.uriContext.uri;
      }

      res.render('chat-template', {
        isRepo: troupe.githubType === 'REPO',
        appCache: getAppCache(req),
        bootScriptName: 'router-chat',
        githubLink: githubLink,
        troupeName: req.uriContext.uri,
        troupeTopic: troupeContext.troupe.topic,
        oneToOne: troupe.oneToOne,
        troupeFavourite: troupeContext.troupe.favourite,
        user: troupeContext.user,
        troupeContext: troupeContext,
        chats: chats,
        agent: req.headers['user-agent']
      });

    })
    .fail(next);
}

function renderMobileUserHome(req, res, next) {
  contextGenerator.generateMiniContext(req, function(err, troupeContext) {
    if(err) return next(err);

    res.render('mobile/mobile-app', {
      useAppCache: !!nconf.get('web:useAppCache'),
      bootScriptName: 'mobile-userhome',
      troupeName: req.uriContext.uri,
      troupeContext: troupeContext,
      agent: req.headers['user-agent'],
      isUserhome: true
    });
  });
}

function renderMobileChat(req, res, next) {
  var troupe = req.uriContext.troupe;

  var userId = req.user && req.user.id;

  Q.all([
    contextGenerator.generateTroupeContext(req),
    restful.serializeChatsForTroupe(troupe.id, userId, { limit: INITIAL_CHAT_COUNT })
    ]).spread(function(troupeContext, chats) {
      res.render('mobile/mobile-app', {
        appCache: getAppCache(req),
        bootScriptName: 'mobile-app',
        troupeName: req.uriContext.uri,
        troupeTopic: troupeContext.troupe.topic,
        troupeFavourite: troupeContext.troupe.favourite,
        user: troupeContext.user,
        troupeContext: troupeContext,
        chats: chats,
        agent: req.headers['user-agent']
      });

    })
    .fail(next);
}

function renderNotLoggedInRoom(req, res, next) {
  var troupe = req.uriContext.troupe;

  Q.all([
    contextGenerator.generateTroupeContext(req),
    restful.serializeChatsForTroupe(troupe.id, null, { limit: INITIAL_CHAT_COUNT })
    ]).spread(function(troupeContext, chats) {

      var githubLink;

      if(troupe.githubType === 'REPO' || troupe.githubType === 'ORG') {
        githubLink = 'https://github.com/' + req.uriContext.uri;
      }

      res.render('chat-not-logged-in-template', {
        isRepo: troupe.githubType === 'REPO',
        appCache: getAppCache(req),
        bootScriptName: 'router-not-logged-in',
        githubLink: githubLink,
        troupeName: req.uriContext.uri,
        troupeTopic: troupeContext.troupe.topic,
        troupeContext: troupeContext,
        chats: chats,
        agent: req.headers['user-agent']
      });

    })
    .fail(next);
}


module.exports = exports = {
  renderHomePage: renderHomePage,
  renderChatPage: renderChatPage,
  renderMainFrame: renderMainFrame,
  renderMobileChat: renderMobileChat,
  renderMobileUserHome: renderMobileUserHome,
  renderNotLoggedInRoom: renderNotLoggedInRoom
};
