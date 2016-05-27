"use strict";

var env = require('gitter-web-env');
var winston = env.logger;
var nconf = env.config;
var errorReporter = env.errorReporter;
var Promise = require('bluebird');
var contextGenerator = require('../../web/context-generator');
var restful = require('../../services/restful');
var userService = require('../../services/user-service');
var chatService = require('../../services/chat-service');
var social = require('../social-metadata');
var restSerializer = require("../../serializers/rest-serializer");
var roomSort = require('gitter-realtime-client/lib/sorts-filters').pojo; /* <-- Don't use the default export
                                                                                          will bring in tons of client-side
                                                                                          libraries that we don't need */
var roomNameTrimmer = require('../../../public/js/utils/room-name-trimmer');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var url = require('url');
var roomMembershipService = require('../../services/room-membership-service');
var troupeService = require('../../services/troupe-service');
var _ = require('lodash');
var GitHubOrgService = require('gitter-web-github').GitHubOrgService;
var orgPermissionModel = require('gitter-web-permissions/lib/models/org-permissions-model');
var userSettingsService = require('../../services/user-settings-service');
var resolveUserAvatarUrl = require('gitter-web-shared/avatars/resolve-user-avatar-url');
var parseRoomsIntoLeftMenuRoomList = require('gitter-web-shared/rooms/left-menu-room-list.js');
var generateLeftMenuSnapshot = require('../snapshots/left-menu-snapshot');
var parseRoomsIntoLeftMenuFavouriteRoomList = require('gitter-web-shared/rooms/left-menu-room-favourite-list');
var generateRoomCardContext = require('gitter-web-shared/templates/partials/room-card-context-generator');
var getSubResources = require('./render/sub-resources');
var fixMongoIdQueryParam = require('../../web/fix-mongo-id-query-param');

/* How many chats to send back */

function getPermalinkChatForRoom(troupe, chatId) {
  if (!troupe || troupe.security !== 'PUBLIC') return Promise.resolve();

  return chatService.findByIdInRoom(troupe.id, chatId)
    .then(function(chat) {
      var strategy = new restSerializer.ChatStrategy({
        notLoggedIn: true,
        troupeId: troupe.id
      });

      return restSerializer.serializeObject(chat, strategy);
    });
}


function renderMainFrame(req, res, next, frame) {
  var user = req.user;
  var userId = user && user.id;
  var aroundId = fixMongoIdQueryParam(req.query.at);

  var selectedRoomId = req.troupe && req.troupe.id;

  Promise.all([
      contextGenerator.generateNonChatContext(req),
      restful.serializeTroupesForUser(userId),
      aroundId && getPermalinkChatForRoom(req.troupe, aroundId),
      restful.serializeOrgsForUserId(userId).catch(function(err) {
        // Workaround for GitHub outage
        winston.error('Failed to serialize orgs:' + err, { exception: err });
        return [];
      }),

    ])
    .spread(function (troupeContext, rooms, permalinkChat, orgs) {

      var chatAppQuery = {};
      if (aroundId) { chatAppQuery.at = aroundId; }
      var chatAppLocation = url.format({
        pathname: '/' + req.uriContext.uri + '/~' + frame,
        query:    chatAppQuery,
        hash:     '#initial'
      });

      var template, bootScriptName;

      if (req.user) {
        template = 'app-template';
        bootScriptName = 'router-app';
      } else {
        template = 'app-nli-template';
        bootScriptName = 'router-nli-app';
      }

      var socialMetadata = permalinkChat ?
        social.getMetadataForChatPermalink({ room: req.troupe, chat: permalinkChat }) :
        social.getMetadata({ room: req.troupe });

      //TODO Pass this to MINIBAR?? JP 17/2/16
      var hasNewLeftMenu = !req.isPhone && req.fflip && req.fflip.has('left-menu');
      var snapshots = troupeContext.snapshots = generateLeftMenuSnapshot(req, troupeContext, rooms);
      var leftMenuRoomList = parseRoomsIntoLeftMenuRoomList(snapshots.leftMenu.state, snapshots.rooms, snapshots.leftMenu.selectedOrgName);
      var leftMenuFavouriteRoomList = parseRoomsIntoLeftMenuFavouriteRoomList(snapshots.leftMenu.state, snapshots.rooms, snapshots.leftMenu.selectedOrgName);

      var previousLeftMenuState = troupeContext.leftRoomMenuState;
      var newLeftMenuState = snapshots['leftMenu'];
      if(req.user && !_.isEqual(previousLeftMenuState, newLeftMenuState)) {
        // Save our left-menu state so that if they don't send any updates on the client,
        // we still have it when they refresh. We can't save it where it is changed(`./shared/parse/left-menu-troupe-context.js`)
        // because that is in shared and the user-settings-service is in `./server`
        userSettingsService.setUserSettings(req.user._id, 'leftRoomMenu', newLeftMenuState)
          .catch(function(err) {
            errorReporter(err, { userSettingsServiceSetFailed: true }, { module: 'app-render' });
          });
      }


      //TODO Remove this when favourite tab is removed for realz JP 8/4/16
      if(snapshots.leftMenu.state === 'favourite') { leftMenuRoomList = []; }

      // pre-processing rooms
      // Bad mutation ... BAD MUTATION
      rooms = rooms
        .filter(function(f) {
          /* For some reason there can be null rooms. TODO: fix this upstream */
          return !!f;
        })
        .map(function(room) {
          room.selected = mongoUtils.objectIDsEqual(room.id, selectedRoomId);
          room.name = roomNameTrimmer(room.name);
          return room;
        });

      res.render(template, {
        socialMetadata:         socialMetadata,
        bootScriptName:         bootScriptName,
        cssFileName:            "styles/" + bootScriptName + ".css",
        troupeName:             req.uriContext.uri,
        troupeContext:          troupeContext,
        roomMenuIsPinned:       snapshots.leftMenu.roomMenuIsPinned,
        chatAppLocation:        chatAppLocation,
        agent:                  req.headers['user-agent'],
        subresources:           getSubResources(bootScriptName),
        showFooterButtons:      true,
        showUnreadTab:          true,
        menuHeaderExpanded:     false,
        user:                   user,
        orgs:                   orgs,
        hasNewLeftMenu:         hasNewLeftMenu,
        leftMenuOrgs:           troupeContext.snapshots.orgs,
        leftMenuRooms:          leftMenuRoomList,
        leftMenuFavouriteRooms: leftMenuFavouriteRoomList,
        isPhone:            req.isPhone,
        //TODO Remove this when left-menu switch goes away JP 23/2/16
        rooms: {
          favourites: rooms
            .filter(roomSort.favourites.filter)
            .sort(roomSort.favourites.sort),
          recents: rooms
            .filter(roomSort.recents.filter)
            .sort(roomSort.recents.sort)
        },
        userHasNoOrgs: !orgs || !orgs.length

      });

      return null;
    })
    .catch(next);
}

function renderOrgPage(req, res, next) {
  var org = req.uriContext && req.uriContext.uri;
  var opts = {};

  var ROOMS_PER_PAGE = 15;

  // Show only public rooms to not logged in users
  if (!req.user) opts.security = 'PUBLIC';

  var ghOrgService = new GitHubOrgService(req.user);

  return Promise.all([
    ghOrgService.getOrg(org).catch(function() { return {login: org}; }),
    troupeService.findChildRoomsForOrg(org, opts),
    contextGenerator.generateNonChatContext(req),
    orgPermissionModel(req.user, 'admin', org),
    orgPermissionModel(req.user, 'join', org)
  ])
  .spread(function (ghOrg,rooms, troupeContext, isOrgAdmin, isOrgMember) {
    var isStaff = !!(troupeContext.user || {}).staff;

    // Filter out PRIVATE rooms
    _.remove(rooms, function(room) { return room.security === 'PRIVATE'; });

    // Filter out ORG room and INHERITED permission rooms for non-org members
    if (!isOrgMember) {
      _.remove(rooms, function(room) {
        return (room.githubType === 'ORG' || room.security === 'INHERITED');
      });
    }

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
    return Promise.all(getMembers)
    .then(function(values) {
      rooms.forEach(function(room, index) {
        room.userIds = values[index];
      });

      var populateUsers = rooms.map(function(room) {
        return userService.findByIds(room.userIds);
      });

      return Promise.all(populateUsers);
    })
    .then(function(values) {
       rooms.forEach(function(room, index) {
        room.users = values[index];
        _.each(room.users, function(user) {
          user.avatarUrlSmall = resolveUserAvatarUrl(user, 60);
        });
      });

      // Custom data for the org page
      rooms = rooms.map(function(room) {
        var result = generateRoomCardContext(room, {
          isStaff: isStaff
        });
        result.isStaff = isOrgAdmin || result.isStaff;
        return result;
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
        exploreBaseUrl: '/home/~explore',
        roomCount: roomCount,
        orgUserCount: orgUserCount,
        org: ghOrg || {
          login: org
        },
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
        agent: req.headers['user-agent']
      });
    })
    .catch(next);
}

module.exports = exports = {
  renderMainFrame: renderMainFrame,
  renderOrgPage: renderOrgPage,
  renderUserNotSignedUp: renderUserNotSignedUp,
  renderUserNotSignedUpMainFrame: renderUserNotSignedUpMainFrame
};
