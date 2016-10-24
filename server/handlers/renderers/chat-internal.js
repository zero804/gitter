"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var Promise = require('bluebird');
var contextGenerator = require('../../web/context-generator');
var restful = require('../../services/restful');
var burstCalculator = require('../../utils/burst-calculator');
var userSort = require('../../../public/js/utils/user-sort');
var unreadItemService = require('../../services/unread-items');
var _ = require('lodash');
var getSubResources = require('./sub-resources');
var fixMongoIdQueryParam = require('../../web/fix-mongo-id-query-param');
var fonts = require('../../web/fonts');
var generateRightToolbarSnapshot = require('../snapshots/right-toolbar-snapshot');
var getHeaderViewOptions = require('gitter-web-shared/templates/get-header-view-options');

/* How many chats to send back */
var INITIAL_CHAT_COUNT = 50;
var ROSTER_SIZE = 25;


function renderChat(req, res, next, options) {
  var uriContext = options.uriContext;

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
        options.generateContext === false ? { } : contextGenerator.generateTroupeContext(req, { snapshots: { chat: snapshotOptions }, permalinkChatId: aroundId }),
        restful.serializeChatsForTroupe(troupe.id, userId, chatSerializerOptions),
        options.fetchEvents === false ? null : restful.serializeEventsForTroupe(troupe.id, userId),
        options.fetchUsers === false ? null : restful.serializeUsersForTroupe(troupe.id, userId, userSerializerOptions),
        generateRightToolbarSnapshot(req)
      ]).spread(function (troupeContext, chats, activityEvents, users, rightToolbarSnapshot) {
        var initialChat = _.find(chats, function(chat) { return chat.initial; });
        var initialBottom = !initialChat;
        var githubLink;
        var classNames = options.classNames || [];
        var isStaff = req.user && req.user.staff;

        var snapshots = rightToolbarSnapshot;
        troupeContext.snapshots = snapshots;

        if(troupe.githubType === 'REPO' || troupe.githubType === 'ORG') {
          githubLink = 'https://github.com/' + req.uriContext.uri;
        }

        if (!user) classNames.push("logged-out");

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

        var isRightToolbarPinned = snapshots && snapshots.rightToolbar && snapshots.rightToolbar.isPinned;
        if(isRightToolbarPinned === undefined) {
          isRightToolbarPinned = true;
        }

        var renderOptions = _.extend({
            hasCachedFonts: fonts.hasCachedFonts(req.cookies),
            fonts: fonts.getFonts(),
            isRepo: troupe.sd.type === 'GH_REPO', // Used by chat_toolbar patial
            bootScriptName: script,
            cssFileName: cssFileName,
            githubLink: githubLink,
            troupeName: req.uriContext.uri,
            oneToOne: troupe.oneToOne, // Used by the old left menu
            user: user,
            troupeContext: troupeContext,
            initialBottom: initialBottom,
            chats: chatsWithBurst,
            classNames: classNames.join(' '),
            subresources: getSubResources(script),
            activityEvents: activityEvents,
            users: users && users.sort(userSort),
            userCount: troupe.userCount,
            hasHiddenMembers: troupe.userCount > 25,
            integrationsUrl: integrationsUrl,
            isMobile: options.isMobile,
            roomMember: req.uriContext.roomMember,
            isRightToolbarPinned: isRightToolbarPinned,

            //Feature Switch Left Menu
            troupeTopic: troupeContext.troupe.topic,
            premium: troupeContext.troupe.premium,
            troupeFavourite: troupeContext.troupe.favourite,
            headerView: getHeaderViewOptions(troupeContext.troupe),
            canChangeGroupAvatar: !troupe.groupId && (isStaff || isAdmin),
            isAdmin: isAdmin,
            isNativeDesktopApp: troupeContext.isNativeDesktopApp
          }, options.extras);

          res.render(options.template, renderOptions);
        });
    })
    .catch(next);
}

module.exports = renderChat;
