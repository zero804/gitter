"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var Promise = require('bluebird');
var contextGenerator = require('../../web/context-generator');
var restful = require('../../services/restful');
var burstCalculator = require('../../utils/burst-calculator');
var userSort = require('../../../public/js/utils/user-sort');
var isolateBurst = require('gitter-web-shared/burst/isolate-burst-array');
var unreadItemService = require('../../services/unread-items');
var _ = require('lodash');

var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');
var getSubResources = require('./sub-resources');
var fixMongoIdQueryParam = require('../../web/fix-mongo-id-query-param');
var fonts = require('../../web/fonts');
var generateRightToolbarSnapshot = require('../snapshots/right-toolbar-snapshot');

var troupeService = require('../../services/troupe-service');
var roomMembershipService = require('../../services/room-membership-service');


/* How many chats to send back */
var INITIAL_CHAT_COUNT = 50;
var ROSTER_SIZE = 25;

function renderChat(req, res, options, next) {
  var troupe = req.uriContext.troupe;
  var aroundId = fixMongoIdQueryParam(req.query.at);
  var script = options.script;
  var user = req.user;
  var userId = user && user.id;

  // It's ok if there's no user (logged out), unreadItems will be 0
  return unreadItemService.getUnreadItemsForUser(userId, troupe.id)
  .then(function(unreadItems) {
    var limit = unreadItems.chat.length > INITIAL_CHAT_COUNT ? unreadItems.chat.length + 20 : INITIAL_CHAT_COUNT;

    var snapshotOptions = {
        limit: limit, //options.limit || INITIAL_CHAT_COUNT,
      aroundId: aroundId,
      unread: options.unread // Unread can be true, false or undefined
    };

    var chatSerializerOptions = _.defaults({
    }, snapshotOptions);

    var userSerializerOptions = _.defaults({
      lean: true,
      limit: ROSTER_SIZE
    }, snapshotOptions);

    return Promise.all([
        options.generateContext === false ? null : contextGenerator.generateTroupeContext(req, { snapshots: { chat: snapshotOptions }, permalinkChatId: aroundId }),
        restful.serializeChatsForTroupe(troupe.id, userId, chatSerializerOptions),
        options.fetchEvents === false ? null : restful.serializeEventsForTroupe(troupe.id, userId),
        options.fetchUsers === false ? null : restful.serializeUsersForTroupe(troupe.id, userId, userSerializerOptions),
        troupeService.checkGitHubTypeForUri(troupe.lcOwner || '', 'ORG'),
        generateRightToolbarSnapshot(req)
      ]).spread(function (troupeContext, chats, activityEvents, users, ownerIsOrg, rightToolbarSnapshot) {

        var initialChat = _.find(chats, function(chat) { return chat.initial; });
        var initialBottom = !initialChat;
        var githubLink;
        var classNames = options.classNames || [];

        var snapshots = rightToolbarSnapshot;
        troupeContext.snapshots = snapshots;

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

        var cssFileName = options.stylesheet ? "styles/" + options.stylesheet + ".css" : "styles/" + script + ".css"; // css filename matches bootscript

        var chatsWithBurst = burstCalculator(chats);
        if (options.filterChats) {
          chatsWithBurst = options.filterChats(chatsWithBurst);
        }

        /* This is less than ideal way of checking if the user is the admin */
        var isAdmin = troupeContext.troupe && troupeContext.troupe.permissions && troupeContext.troupe.permissions.admin;

        //add ownerIsOrg to the troupe model
        troupeContext.troupe.ownerIsOrg = ownerIsOrg;
        var orgName = getOrgNameFromTroupeName(troupeContext.troupe.name);
        var orgPageHref = '/orgs/' + orgName + '/rooms/';

        var renderOptions = _.extend({
            hasCachedFonts: fonts.hasCachedFonts(req.cookies),
            fonts: fonts.getFonts(),
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
            subresources: getSubResources(script),
            isPrivate: isPrivate,
            activityEvents: activityEvents,
            users: users && users.sort(userSort),
            userCount: troupe.userCount,
            hasHiddenMembers: troupe.userCount > 25,
            integrationsUrl: integrationsUrl,
            isMobile: options.isMobile,
            ownerIsOrg: ownerIsOrg,
            orgPageHref: orgPageHref,
            roomMember: req.uriContext.roomMember,
            isRightToolbarPinned: snapshots && snapshots.rightToolbar && snapshots.rightToolbar.isPinned,

            //Feature Switch Left Menu
            hasNewLeftMenu: req.fflip && req.fflip.has('left-menu'),

          }, troupeContext && {
            troupeTopic: troupeContext.troupe.topic,
            premium: troupeContext.troupe.premium,
            troupeFavourite: troupeContext.troupe.favourite,
            avatarSrcSet:  resolveRoomAvatarSrcSet({ uri: troupeContext.troupe.url }, 48),
            isAdmin: isAdmin,
            isNativeDesktopApp: troupeContext.isNativeDesktopApp
          }, options.extras);

          res.render(options.template, renderOptions);
        });
    })
    .catch(next);
}

function renderChatPage(req, res, next) {
  var scriptName = 'router-chat';

  return renderChat(req, res, {
    template: 'chat-template',
    script: scriptName
  }, next);
}

function renderMobileChat(req, res, next) {
  return renderChat(req, res, {
    template: 'mobile/mobile-chat',
    script: 'mobile-app',
    isMobile: true
  }, next);
}

function renderMobileNativeEmbeddedChat(req, res) {
  res.render('mobile/native-embedded-chat-app', {
    isMobile: true,
    troupeContext: {}
  });
}

function renderMobileNotLoggedInChat(req, res, next) {
  return renderChat(req, res, {
    template: 'mobile/mobile-nli-chat',
    script: 'mobile-nli-app',
    unread: false, // Not logged in users see chats as read
    fetchEvents: false,
    fetchUsers: false,
    isMobile: true
  }, next);
}

function renderNotLoggedInChatPage(req, res, next) {
  return renderChat(req, res, {
    template: 'chat-nli-template',
    script: 'router-nli-chat',
    unread: false // Not logged in users see chats as read
  }, next);
}

function renderEmbeddedChat(req, res, next) {
  roomMembershipService.countMembersInRoom(req.troupe._id)
    .then(function(userCount) {
      return renderChat(req, res, {
        template: 'chat-embed-template',
        script: 'router-embed-chat',
        classNames: [ 'embedded' ],
        fetchEvents: false,
        fetchUsers: false,
        extras: {
          usersOnline: userCount
        }
      }, next);
    })
    .catch(next);
}

function renderNotLoggedInEmbeddedChat(req, res, next) {
  roomMembershipService.countMembersInRoom(req.troupe._id)
    .then(function(userCount) {
      return renderChat(req, res, {
        template: 'chat-nli-embed-template',
        script: 'router-nli-embed-chat',
        unread: false, // Embedded users see chats as read
        classNames: [ 'embedded' ],
        fetchEvents: false,
        fetchUsers: false,
        extras: {
          usersOnline: userCount
        }
      }, next);
    })
    .catch(next);
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
      var permalinkedChat = _.find(chats, function(chat) { return chat.id === aroundId; });
      if (!permalinkedChat) return [];

      var burstChats = isolateBurst(chats, permalinkedChat);
      return burstChats;
    }
  }, next);
}


module.exports = exports = {
  renderChatPage: renderChatPage,
  renderMobileChat: renderMobileChat,
  renderEmbeddedChat: renderEmbeddedChat,
  renderNotLoggedInEmbeddedChat: renderNotLoggedInEmbeddedChat,
  renderChatCard: renderChatCard,
  renderMobileNotLoggedInChat: renderMobileNotLoggedInChat,
  renderNotLoggedInChatPage: renderNotLoggedInChatPage,
  renderMobileNativeEmbeddedChat: renderMobileNativeEmbeddedChat
};
