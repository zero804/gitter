/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";
var nconf              = require('../../utils/config');
var Q                  = require('q');
var contextGenerator   = require('../../web/context-generator');
var restful            = require('../../services/restful');
var userService        = require('../../services/user-service');
var chatService        = require('../../services/chat-service');
var appVersion         = require('../../web/appVersion');
var social             = require('../social-metadata');
var PersistenceService = require('../../services/persistence-service');
var restSerializer     = require("../../serializers/rest-serializer");
var burstCalculator    = require('../../utils/burst-calculator');
var userSort           = require('../../../public/js/utils/user-sort');
var roomSort           = require('../../../public/js/utils/room-sort');
var roomNameTrimmer    = require('../../../public/js/utils/room-name-trimmer');
var isolateBurst       = require('../../../shared/burst/isolate-burst-array');
var url                =  require('url');

var trimRoomName = function (room) {
  room.name = roomNameTrimmer(room.name);
  return room;
};

var markSelected = function (id, room) {
  room.selected = room.id === id;
  return room;
};

var avatar   = require('../../utils/avatar');
var _                 = require('underscore');

/* How many chats to send back */
var INITIAL_CHAT_COUNT = 50;
var USER_COLLECTION_FOLD = 21;

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

function getPermalinkChatForRoom(troupe, chatId) {
  if (!troupe || troupe.security !== 'PUBLIC') return Q.resolve();

  return chatService.findByIdInRoom(troupe.id, chatId)
    .then(function(chat) {
      var strategy = new restSerializer.ChatStrategy({
        notLoggedIn: true,
        troupeId: troupe.id
      });

      return restSerializer.serialize(chat, strategy);
    });
}

function renderMainFrame(req, res, next, frame) {

  var user = req.user;
  var userId = user && user.id;
  var aroundId = req.query.at;

  var selectedRoomId = req.troupe && req.troupe.id;

  Q.all([
    contextGenerator.generateNonChatContext(req),
    restful.serializeTroupesForUser(userId),
    restful.serializeOrgsForUserId(userId),
    aroundId && getPermalinkChatForRoom(req.troupe, aroundId)
  ])
    .spread(function (troupeContext, rooms, orgs, permalinkChat) {
      var chatAppLocation = url.format({
        pathname: '/' + req.uriContext.uri + '/~' + frame,
        query: {
          at: aroundId
        },
        hash: '#initial'
      });

      var template, bootScriptName;

      if (req.user) {
        template = 'app-template';
        bootScriptName = 'router-app';
      } else {
        template = 'app-nli-template';
        bootScriptName = 'router-nli-app';
      }

      // pre-processing rooms
      rooms = rooms
        .map(markSelected.bind(null, selectedRoomId))
        .map(trimRoomName);

      var socialMetadata = permalinkChat ?
        social.getMetadataForChatPermalink({ room: req.troupe, chat: permalinkChat  }) :
        social.getMetadata({ room: req.troupe  });

      res.render(template, {
        socialMetadata: socialMetadata,
        bootScriptName: bootScriptName,
        cssFileName: "styles/" + bootScriptName + ".css",
        troupeName: req.uriContext.uri,
        troupeContext: troupeContext,
        chatAppLocation: chatAppLocation,
        agent: req.headers['user-agent'],
        stagingText: stagingText,
        stagingLink: stagingLink,
        dnsPrefetch: dnsPrefetch,
        showFooterButtons: true,
        menuHeaderExpanded: false,
        user: user,
        rooms: {
          favourites: rooms
            .filter(roomSort.favourites.filter)
            .sort(roomSort.favourites.sort),
          recents: rooms
            .filter(roomSort.recents.filter)
            .sort(roomSort.recents.sort)
        },
        orgs: orgs
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
    limit: options.limit || INITIAL_CHAT_COUNT,
    aroundId: aroundId,
    unread: options.unread // Unread can be true, false or undefined
  };

  var serializerOptions = _.defaults({
    disableLimitReachedMessage: true,
    lean: true
  }, snapshotOptions);

  Q.all([
      options.generateContext === false ? null : contextGenerator.generateTroupeContext(req, { snapshots: { chat: snapshotOptions }, permalinkChatId: aroundId }),
      restful.serializeChatsForTroupe(troupe.id, userId, serializerOptions),
      options.fetchEvents === false ? null : restful.serializeEventsForTroupe(troupe.id, userId),
      options.fetchUsers === false ? null :restful.serializeUsersForTroupe(troupe.id, userId, serializerOptions)
    ]).spread(function (troupeContext, chats, activityEvents, users) {
      var initialChat = _.find(chats, function(chat) { return chat.initial; });
      var initialBottom = !initialChat;
      var githubLink;
      var classNames = options.classNames || [];

      if(troupe.githubType === 'REPO' || troupe.githubType === 'ORG') {
        githubLink = 'https://github.com/' + req.uriContext.uri;
      }

      if (!user) classNames.push("logged-out");

      var isPrivate = troupe.security !== "PUBLIC";
      var integrationsUrl;

      if (troupeContext && troupeContext.isNativeDesktopApp) {
         integrationsUrl = nconf.get('web:basepath') + '/' + troupeContext.troupe.uri + '#integrations';
      } else {
        integrationsUrl = '#integrations';
      }

      var cutOff = users ? users.length - USER_COLLECTION_FOLD : 0;
      var remainingCount = (cutOff > 0) ? cutOff : 0;
      var cssFileName = options.stylesheet ? "styles/" + options.stylesheet + ".css" : "styles/" + script + ".css"; // css filename matches bootscript

      var chatsWithBurst = burstCalculator(chats);
      if (options.filterChats) {
        chatsWithBurst = options.filterChats(chatsWithBurst);
      }

      var renderOptions = _.extend({
          isRepo: troupe.githubType === 'REPO',
          bootScriptName: script,
          cssFileName: cssFileName,
          githubLink: githubLink,
          troupeName: req.uriContext.uri,
          oneToOne: troupe.oneToOne,
          user: user,
          troupeContext: troupeContext,
          initialBottom: initialBottom,
          chats: chatsWithBurst,
          classNames: classNames.join(' '),
          agent: req.headers['user-agent'],
          dnsPrefetch: dnsPrefetch,
          isPrivate: isPrivate,
          activityEvents: activityEvents,
          users: users && users.sort(userSort).slice(0, USER_COLLECTION_FOLD),
          remainingCount: remainingCount,
          integrationsUrl: integrationsUrl,
          placeholder: 'Click here to type a chat message. Supports GitHub flavoured markdown.'
        }, troupeContext && {
          troupeTopic: troupeContext.troupe.topic,
          plan: troupeContext.troupe.plan,
          troupeFavourite: troupeContext.troupe.favourite,
          avatarUrl: avatar(troupeContext.troupe),
          isAdmin: troupeContext.permissions.admin,
          isNativeDesktopApp: troupeContext.isNativeDesktopApp
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

function renderMobileNativeUserhome(req, res) {
  contextGenerator.generateNonChatContext(req)
    .then(function(troupeContext) {
      res.render('mobile/native-userhome-app', {
        bootScriptName: 'mobile-native-userhome',
        troupeContext: troupeContext
      });
    });
}

function renderMobileNotLoggedInChat(req, res, next) {
  return renderChat(req, res, {
    template: 'mobile/mobile-nli-chat',
    script: 'mobile-nli-app',
    unread: false // Not logged in users see chats as read
  }, next);
}

function renderNotFound(req, res, next) {
  var org = req.uriContext && req.uriContext.uri;
  var strategy = new restSerializer.TroupeStrategy();

  return PersistenceService.Troupe.find({ lcOwner: org.toLowerCase(), security: 'PUBLIC' })
    .sort({ userCount: 'desc' })
    .execQ()
    .then(function (rooms) {
      return new Q(restSerializer.serialize(rooms, strategy));
    })
    .then(function (rooms) {
      res.render('not-found', {
        cssFileName: "styles/not-found.css",
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

function renderChatCard(req, res, next) {
  if (!req.query.at) return next(400);
  var aroundId = req.query.at;

  return renderChat(req, res, {
    limit: 20,
    template: 'chat-card-template',
    stylesheet: 'chat-card',
    fetchEvents: false,
    fetchUsers: false,
    generateContext: false,
    unread: false, // Embedded users see chats as read
    classNames: [ 'card' ],
    filterChats: function(chats) {
      // Only show the burst
      // TODO: move this somewhere useful
      var permalinkedChat = _.find(chats, function(chat) { return chat.id == aroundId; });
      if (!permalinkedChat) return [];

      var burstChats = isolateBurst(chats, permalinkedChat);
      return burstChats;
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
  renderChatCard: renderChatCard,
  renderMobileNotLoggedInChat: renderMobileNotLoggedInChat,
  renderNotLoggedInChatPage: renderNotLoggedInChatPage,
  renderMobileNativeEmbeddedChat: renderMobileNativeEmbeddedChat,
  renderMobileNativeUserhome: renderMobileNativeUserhome,
  renderUserNotSignedUp: renderUserNotSignedUp,
  renderUserNotSignedUpMainFrame: renderUserNotSignedUpMainFrame
};
