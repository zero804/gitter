/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";
var nconf              = require('../../utils/config');
var Q                  = require('q');
var contextGenerator   = require('../../web/context-generator');
var restful            = require('../../services/restful');
var userService        = require('../../services/user-service');
var appVersion         = require('../../web/appVersion');
var social             = require('../social-metadata');
var PersistenceService = require('../../services/persistence-service');
var restSerializer     = require("../../serializers/rest-serializer");

var burstCalculator   = require('../../utils/burst-calculator');
var avatar   = require('../../utils/avatar');
var _                 = require('underscore');

/* How many chats to send back */
var INITIAL_CHAT_COUNT = 50;

var stagingText, stagingLink;
var dnsPrefetch = (nconf.get('cdn:hosts') || []).concat([
  nconf.get('ws:hostname')
]);

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
        cssFileName: "styles/" + bootScriptName + ".css",
        troupeName: req.uriContext.uri,
        troupeContext: troupeContext,
        agent: req.headers['user-agent'],
        isUserhome: true,
        billingBaseUrl: nconf.get('web:billingBaseUrl')
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
        socialMetadata: social.getMetadata({ room: req.troupe }),
        appCache: getAppCache(req),
        bootScriptName: bootScriptName,
        cssFileName: "styles/" + bootScriptName + ".css",
        troupeName: req.uriContext.uri,
        troupeContext: troupeContext,
        chatAppLocation: chatAppLocation,
        agent: req.headers['user-agent'],
        stagingText: stagingText,
        stagingLink: stagingLink,
        dnsPrefetch: dnsPrefetch
      });
    })
    .fail(next);
}

function renderChat(req, res, options, next) {
  var troupe = req.uriContext.troupe;
  var aroundId = req.query.at;
  var script = options.script;
  var user = req.user;
  var userId = user && user.id;

  var snapshotOptions = {
    limit: INITIAL_CHAT_COUNT,
    aroundId: aroundId,
    unread: options.unread // Unread can be true, false or undefined
  };

  var serializerOptions = _.defaults({
    disableLimitReachedMessage: true,
    lean: true
  }, snapshotOptions);

  console.log('serializerOptions:', serializerOptions);

  Q.all([
      contextGenerator.generateTroupeContext(req, { snapshots: { chat: snapshotOptions } }),
      restful.serializeChatsForTroupe(troupe.id, userId, serializerOptions),
      restful.serializeEventsForTroupe(troupe.id, userId),
      restful.serializeUsersForTroupe(troupe.id, userId, serializerOptions)
    ]).spread(function (troupeContext, chats, activityEvents, users) {
      console.log('#users:', users);
      var initialChat = _.find(chats, function(chat) { return chat.initial; });
      var initialBottom = !initialChat;
      var githubLink;
      var classNames = options.classNames || [];

      if(troupe.githubType === 'REPO' || troupe.githubType === 'ORG') {
        githubLink = 'https://github.com/' + req.uriContext.uri;
      }

      if (!user) classNames.push("logged-out");

      var isPrivate = troupe.security !== "PUBLIC";

      var renderOptions = _.extend({
          isRepo: troupe.githubType === 'REPO',
          appCache: getAppCache(req),
          bootScriptName: script,
          cssFileName: "styles/" + script + ".css", // css filename matches bootscript
          githubLink: githubLink,
          troupeName: req.uriContext.uri,
          troupeTopic: troupeContext.troupe.topic,
          plan: troupeContext.troupe.plan,
          oneToOne: troupe.oneToOne,
          troupeFavourite: troupeContext.troupe.favourite,
          user: user,
          troupeContext: troupeContext,
          initialBottom: initialBottom,
          chats: burstCalculator(chats),
          classNames: classNames.join(' '),
          agent: req.headers['user-agent'],
          dnsPrefetch: dnsPrefetch,
          isPrivate: isPrivate,
          avatarUrl: avatar(troupeContext.troupe),
          activityEvents: activityEvents,
          users: users
        }, options.extras);

      res.render(options.template, renderOptions);

    })
    .fail(next);
}

function renderChatPage(req, res, next) {
  return renderChat(req, res, {
    template: 'chat-template',
    script: 'router-chat'
  }, next);
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
        dnsPrefetch: dnsPrefetch
      });
    })
    .fail(next);
}

function renderMobileChat(req, res, next) {
  return renderChat(req, res, {
    template: 'mobile/mobile-chat',
    script: 'mobile-app'
  }, next);
}

function renderMobileNativeEmbeddedChat(req, res) {
  res.render('mobile/native-embedded-chat-app', {
    troupeContext: {}
  });
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
  res.render('mobile/native-userhome-app', {
    bootScriptName: 'mobile-native-userhome',
    troupeContext: {
      userId: req.user.id
    }
  });
}

function renderMobileNotLoggedInChat(req, res, next) {
  return renderChat(req, res, {
    template: 'mobile/mobile-app',
    script: 'mobile-nli-app',
    unread: false // Not logged in users see chats as read
  }, next);
}

function renderNotFound(req, res, next) {
  var org = req.uriContext && req.uriContext.uri;
  var strategy = new restSerializer.TroupeStrategy();

  return PersistenceService.Troupe.findQ({ lcOwner: org.toLowerCase(), security: 'PUBLIC' })
    .then(function (rooms) {
      return new Q(restSerializer.serialize(rooms, strategy));
    })
    .then(function (rooms) {
      res.render('not-found', {
        cssFileName: "/styles/not-found.css",
        org: org,
        rooms: rooms
      });
    })
    .catch(next);
}


function renderNotLoggedInChatPage(req, res, next) {
  return renderChat(req, res, {
    template: 'chat-nli-template',
    script: 'router-nli-chat',
    unread: false // Not logged in users see chats as read
  }, next);
}

function renderEmbeddedChat(req, res, next) {
  return renderChat(req, res, {
    template: 'chat-embed-template',
    script: 'router-embed-chat',
    unread: false, // Embedded users see chats as read
    classNames: [ 'embedded' ],
    extras: {
      usersOnline: req.troupe.users.length
    }
  }, next);
}

/**
 * renderUserNotSignedUp() renders a set template for a 1:1 chat, with an invited user.
 */
function renderUserNotSignedUp(req, res, next) {
  userService.findByUsername(req.params.roomPart1)
    .then(function (user) {
      res.render('chat-invited-template', {
        cssFileName: "styles/router-nli-chat.css", // TODO: this shouldn't be hardcoded as this
        appCache: getAppCache(req),
        agent: req.headers['user-agent'],
        oneToOneInvited: true,
        invitedUser: user,
        troupeName: user.username,
        shareURL: nconf.get('web:basepath') + '/' + req.user.username,
        avatarUrl: user.gravatarImageUrl
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
        cssFileName: "styles/" + bootScriptName + ".css",
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
  renderNotFound: renderNotFound,
  renderMobileChat: renderMobileChat,
  renderMobileUserHome: renderMobileUserHome,
  renderEmbeddedChat: renderEmbeddedChat,
  renderMobileNotLoggedInChat: renderMobileNotLoggedInChat,
  renderNotLoggedInChatPage: renderNotLoggedInChatPage,
  renderMobileNativeEmbeddedChat: renderMobileNativeEmbeddedChat,
  renderMobileNativeChat: renderMobileNativeChat,
  renderMobileNativeUserhome: renderMobileNativeUserhome,
  renderUserNotSignedUp: renderUserNotSignedUp,
  renderUserNotSignedUpMainFrame: renderUserNotSignedUpMainFrame
};
