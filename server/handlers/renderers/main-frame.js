"use strict";

var env = require('gitter-web-env');
var winston = env.logger;
var errorReporter = env.errorReporter;
var nconf = env.config;
var statsd = env.createStatsClient({ prefix: nconf.get('stats:statsd:prefix')});
var Promise = require('bluebird');
var contextGenerator = require('../../web/context-generator');
var restful = require('../../services/restful');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var url = require('url');
var _ = require('lodash');
var chatService = require('../../services/chat-service');
var social = require('../social-metadata');
var restSerializer = require("../../serializers/rest-serializer");
var roomSort = require('gitter-realtime-client/lib/sorts-filters').pojo; /* <-- Don't use the default export
                                                                                          will bring in tons of client-side
                                                                                          libraries that we don't need */
var roomNameTrimmer = require('../../../public/js/utils/room-name-trimmer');
var userSettingsService = require('../../services/user-settings-service');
var getSubResources = require('./sub-resources');
var fixMongoIdQueryParam = require('../../web/fix-mongo-id-query-param');
var mapGroupsForRenderer = require('../../handlers/map-groups-for-renderer');
var fonts = require('../../web/fonts.js');

var generateMainFrameSnapshots = require('../../handlers/snapshots/main-frame');

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
      restful.serializeGroupsForUserId(userId),

    ])
    .spread(function (troupeContext, rooms, permalinkChat, orgs, groups) {

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

        //switches
      var hasNewLeftMenu = !req.isPhone && req.fflip && req.fflip.has('left-menu');
      var snapshots = troupeContext.snapshots = generateMainFrameSnapshots(req, troupeContext, rooms, groups);

      if(snapshots && snapshots.leftMenu && snapshots.leftMenu.state) {
        // `gitter.web.prerender-left-menu`
        statsd.increment('prerender-left-menu', 1, 0.25, [
          'state:' + snapshots.leftMenu.state,
          'pinned:' + (snapshots.leftMenu.roomMenuIsPinned ? '1' : '0')
        ]);
      }

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
        //left menu
        hasNewLeftMenu:         hasNewLeftMenu,
        leftMenuOrgs:           troupeContext.snapshots.orgs,
        roomMenuIsPinned:       snapshots.leftMenu.roomMenuIsPinned,

        //fonts
        hasCachedFonts:         fonts.hasCachedFonts(req.cookies),
        fonts:                  fonts.getFonts(),
        socialMetadata:         socialMetadata,
        bootScriptName:         bootScriptName,
        cssFileName:            "styles/" + bootScriptName + ".css",
        troupeName:             req.uriContext.uri,
        troupeContext:          troupeContext,
        chatAppLocation:        chatAppLocation,
        agent:                  req.headers['user-agent'],
        subresources:           getSubResources(bootScriptName),
        showFooterButtons:      true,
        showUnreadTab:          true,
        menuHeaderExpanded:     false,
        user:                   user,
        orgs:                   orgs,
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

module.exports = exports = {
  renderMainFrame: renderMainFrame
};
