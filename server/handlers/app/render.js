/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var winston            = require('../../utils/winston');
var nconf              = require('../../utils/config');
var Q                  = require('q');
var contextGenerator   = require('../../web/context-generator');
var restful            = require('../../services/restful');
var userService        = require('../../services/user-service');
var chatService        = require('../../services/chat-service');
var appVersion         = require('../../web/appVersion');
var social             = require('../social-metadata');
var restSerializer     = require("../../serializers/rest-serializer");
var burstCalculator    = require('../../utils/burst-calculator');
var userSort           = require('../../../public/js/utils/user-sort');
var roomSort           = require('gitter-realtime-client/lib/sorts-filters').pojo; /* <-- Don't use the default export
                                                                                          will bring in tons of client-side
                                                                                          libraries that we don't need */
var roomNameTrimmer    = require('../../../public/js/utils/room-name-trimmer');
var isolateBurst       = require('../../../shared/burst/isolate-burst-array');
var unreadItemService  = require('../../services/unread-item-service');
var mongoUtils         = require('../../utils/mongo-utils');
var url                = require('url');
var cdn                = require("../../web/cdn");
var roomMembershipService = require('../../services/room-membership-service');
var troupeService      = require('../../services/troupe-service');
var useragent          = require('useragent');
var _                 = require('underscore');
var GitHubOrgService   = require('gitter-web-github').GitHubOrgService;
var orgPermissionModel = require('../../services/permissions/org-permissions-model');
var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');

/* How many chats to send back */
var INITIAL_CHAT_COUNT = 50;
var ROSTER_SIZE = 25;

var WELCOME_MESSAGES = [
  'Code for people',
  'Talk about it',
  "Let's try something new",
  'Computers are pretty cool',
  "Don't build Skynet",
  'Make the world better',
  'Computers need people',
  'Everyone secretly loves robots',
  'Initial commit',
  'Hello World',
  'From everywhere, with love',
  '200 OK',
  'UDP like you just dont care',
  'Lovely code for lovely people',
  "Don't drop your computer",
  'Learn, Teach, Repeat. Always Repeat.',
  'Help out on the projects you love',
  "HTTP 418: I'm a teapot",
  'Hey there, nice to see you',
  'Welcome home'
];

function cdnSubResources(resources) {
  return ['vendor'].concat(resources).map(function(f) {
    return cdn('js/' + f + '.js');
  }).concat(cdn('fonts/sourcesans/SourceSansPro-Regular.otf.woff'));
}

var SUBRESOURCES = {
  'router-app': cdnSubResources(['router-app', 'router-chat']),
  'mobile-nli-app': cdnSubResources(['mobile-nli-app', 'router-nli-chat']),
  'mobile-userhome': cdnSubResources(['mobile-userhome']),
  'userhome': cdnSubResources(['userhome']),
  'router-chat': cdnSubResources(['router-chat']),
  'router-nli-chat': cdnSubResources(['router-nli-chat']),
  'mobile-app': cdnSubResources(['mobile-app'])
};

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
      var page = req.isPhone ? 'mobile/mobile-userhome' : 'userhome-template';

      var osName = useragent.parse(req.headers['user-agent']).os.family.toLowerCase();

      var isLinux = osName.indexOf('linux') >= 0;
      var isOsx = osName.indexOf('mac') >= 0;
      var isWindows = osName.indexOf('windows') >= 0;

      // show everything if we cant confirm the os
      var showOsxApp = !isLinux && !isWindows;
      var showWindowsApp = !isLinux && !isOsx;
      var showLinuxApp = !isOsx && !isWindows;

      res.render(page, {
        welcomeMessage: WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)],
        showOsxApp: showOsxApp,
        showWindowsApp: showWindowsApp,
        showLinuxApp: showLinuxApp,
        troupeContext: troupeContext,
        isNativeDesktopApp: troupeContext.isNativeDesktopApp,
        billingBaseUrl: nconf.get('web:billingBaseUrl')
      });
    })
    .catch(next);
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

/**
 * Fixes bad links, like when a browser sends this though
 * /PrismarineJS/node-minecraft-protocol?at=54ea6fcecadb3f7525792ba9)I
 */
function fixBadLinksOnId(value) {
  if (!value) return;
  value = '' + value;

  if (value.length > 24) {
    value = value.substring(0, 24);
  }

  if (!mongoUtils.isLikeObjectId(value)) return;

  return value;
}

function renderMainFrame(req, res, next, frame) {
  var user = req.user;
  var userId = user && user.id;
  var aroundId = fixBadLinksOnId(req.query.at);

  var selectedRoomId = req.troupe && req.troupe.id;

  Q.all([
      contextGenerator.generateNonChatContext(req),
      restful.serializeTroupesForUser(userId),
      restful.serializeOrgsForUserId(userId).catch(function(err) {
        // Workaround for GitHub outage
        winston.error('Failed to serialize orgs:' + err, { exception: err });
        return [];
      }),
      aroundId && getPermalinkChatForRoom(req.troupe, aroundId)
    ])
    .spread(function (troupeContext, rooms, orgs, permalinkChat) {
      var chatAppQuery = {};
      if (aroundId) {
        chatAppQuery.at = aroundId;
      }
      var chatAppLocation = url.format({
        pathname: '/' + req.uriContext.uri + '/~' + frame,
        query: chatAppQuery,
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
        .filter(function(f) {
          /* For some reason there can be null rooms. TODO: fix this upstream */
          return !!f;
        })
        .map(function(room) {
          room.selected = room.id == selectedRoomId;
          room.name = roomNameTrimmer(room.name);
          return room;
        });

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
        subresources: SUBRESOURCES[bootScriptName],
        showFooterButtons: true,
        showUnreadTab: true,
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
    .catch(next);
}

function renderChat(req, res, options, next) {
  var troupe = req.uriContext.troupe;
  var aroundId = fixBadLinksOnId(req.query.at);
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
      lean: true
    }, snapshotOptions);

    var userSerializerOptions = _.defaults({
      lean: true,
      limit: ROSTER_SIZE
    }, snapshotOptions);

    return Q.all([
        options.generateContext === false ? null : contextGenerator.generateTroupeContext(req, { snapshots: { chat: snapshotOptions }, permalinkChatId: aroundId }),
        restful.serializeChatsForTroupe(troupe.id, userId, chatSerializerOptions),
        options.fetchEvents === false ? null : restful.serializeEventsForTroupe(troupe.id, userId),
        options.fetchUsers === false ? null :restful.serializeUsersForTroupe(troupe.id, userId, userSerializerOptions),
        troupeService.checkGitHubTypeForUri(troupe.lcOwner || '', 'ORG')
      ]).spread(function (troupeContext, chats, activityEvents, users, ownerIsOrg) {
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

        var cssFileName = options.stylesheet ? "styles/" + options.stylesheet + ".css" : "styles/" + script + ".css"; // css filename matches bootscript

        var chatsWithBurst = burstCalculator(chats);
        if (options.filterChats) {
          chatsWithBurst = options.filterChats(chatsWithBurst);
        }

        /* This is less than ideal way of checking if the user is the admin */
        var isAdmin = troupeContext.troupe && troupeContext.troupe.permissions && troupeContext.troupe.permissions.admin;

        //add ownerIsOrg to the troupe model
        troupeContext.troupe.ownerIsOrg = ownerIsOrg;

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
            subresources: SUBRESOURCES[script],
            dnsPrefetch: dnsPrefetch,
            isPrivate: isPrivate,
            activityEvents: activityEvents,
            users: users  && users.sort(userSort),
            userCount: troupe.userCount,
            hasHiddenMembers: troupe.userCount > 25,
            integrationsUrl: integrationsUrl,
            inputAutoFocus: !options.mobile,
            placeholder: 'Click here to type a chat message. Supports GitHub flavoured markdown.',
            ownerIsOrg: ownerIsOrg,
            roomMember: req.uriContext.roomMember
          }, troupeContext && {
            troupeTopic: troupeContext.troupe.topic,
            premium: troupeContext.troupe.premium,
            troupeFavourite: troupeContext.troupe.favourite,
            avatarUrl:  resolveRoomAvatarUrl(troupeContext.troupe.url),
            isAdmin: isAdmin,
            isNativeDesktopApp: troupeContext.isNativeDesktopApp
          }, options.extras);

          res.render(options.template, renderOptions);
        });
    })
    .catch(next);
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
      res.render('mobile/mobile-userhome', {
        troupeName: req.uriContext.uri,
        troupeContext: troupeContext,
        agent: req.headers['user-agent'],
        user: req.user,
        dnsPrefetch: dnsPrefetch
      });
    })
    .catch(next);
}

function renderMobileChat(req, res, next) {
  return renderChat(req, res, {
    template: 'mobile/mobile-chat',
    script: 'mobile-app',
    mobile: true
  }, next);
}

function renderMobileNativeEmbeddedChat(req, res) {
  res.render('mobile/native-embedded-chat-app', {
    mobile: true,
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
    unread: false, // Not logged in users see chats as read
    fetchEvents: false,
    fetchUsers: false,
    mobile: true
  }, next);
}

function renderOrgPage(req, res, next) {
  var org = req.uriContext && req.uriContext.uri;
  var opts = {};

  var ROOMS_PER_PAGE = 15;

  // Show only public rooms to not logged in users
  if (!req.user) opts.security = 'PUBLIC';

  var ghOrgService = new GitHubOrgService(req.user);

  return Q.all([
    ghOrgService.getOrg(org).catch(function() { return {login: org}; }),
    troupeService.findChildRoomsForOrg(org, opts),
    contextGenerator.generateNonChatContext(req),
    orgPermissionModel(req.user, 'admin', org),
    orgPermissionModel(req.user, 'join', org)
  ])
  .spread(function (ghOrg,rooms, troupeContext, isOrgAdmin, isOrgMember) {

    // Filter out PRIVATE rooms
    rooms = rooms.filter(function(room) { return room.security !== 'PRIVATE'; });

    // Filter out the ORG room for non org members
    if (!isOrgMember) rooms = rooms.filter(function(room) { return room.githubType !== 'ORG'; });

    // Calculate org user count across all rooms (except private)
    var orgUserCount = rooms.reduce(function(accum, room) {
      return accum + room.userCount;
    }, 0);

    // Calculate total number of rooms
    var roomCount = rooms.length;

    // Calculate total pages
    var pageCount = Math.ceil(rooms.length / ROOMS_PER_PAGE);
    var currentPage = req.query.page || 1;

    // Select only the rooms for this page
    rooms = rooms.slice(currentPage * ROOMS_PER_PAGE - ROOMS_PER_PAGE, currentPage * ROOMS_PER_PAGE);

    var getMembers = rooms.map(function(room) {
      return roomMembershipService.findMembersForRoom(room.id, {limit: 10});
    });

    // Get memberships and then users for the rooms in this page
    return Q.all(getMembers)
    .then(function(values) {
      rooms.forEach(function(room, index) {
        room.userIds = values[index];
      });

      var populateUsers = rooms.map(function(room) {
        return userService.findByIds(room.userIds);
      });

      return Q.all(populateUsers);
    })
    .then(function(values) {
       rooms.forEach(function(room, index) {
        room.users = values[index];
      });

      // Custom data for the org page
      rooms.forEach(function(room) {
        var nameParts = room.uri.split('/');
        room.shortName = nameParts.length === 3 ? nameParts[1] + '/' + nameParts[2] : nameParts[1] || nameParts[0];
        room.canEditTags = isOrgAdmin;
        room.private = room.security !== 'PUBLIC';
      });

      // This is used to track pageViews in mixpanel
      troupeContext.isCommunityPage = true;

      var orgUri = nconf.get('web:basepath') + "/orgs/" + org + "/rooms";
      var text = encodeURIComponent('Explore our chat community on Gitter:');
      var url = 'https://twitter.com/share?' +
        'text=' + text +
        '&url=' + orgUri +
        '&related=gitchat' +
        '&via=gitchat';

      res.render('org-page', {
        socialUrl: url,
        isLoggedIn: !!req.user,
        roomCount: roomCount,
        orgUserCount: orgUserCount,
        org: ghOrg,
        rooms: rooms,
        troupeContext: troupeContext,
        pagination: {
          page: currentPage,
          pageCount: pageCount
        }
      });
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
  roomMembershipService.countMembersInRoom(req.troupe._id)
    .then(function(userCount) {
      return renderChat(req, res, {
        template: 'chat-embed-template',
        script: 'router-embed-chat',
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
    .catch(next);
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
    })
    .catch(next);
}

module.exports = exports = {
  renderHomePage: renderHomePage,
  renderChatPage: renderChatPage,
  renderMainFrame: renderMainFrame,
  renderOrgPage: renderOrgPage,
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
