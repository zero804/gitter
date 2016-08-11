"use strict";

var env = require('gitter-web-env');
var winston = env.logger;
var nconf = env.config;
var statsd = env.createStatsClient({ prefix: nconf.get('stats:statsd:prefix')});
var Promise = require('bluebird');
var contextGenerator = require('../../web/context-generator');
var restful = require('../../services/restful');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var roomSort = require('gitter-realtime-client/lib/sorts-filters').pojo; /* <-- Don't use the default export
                                                                                          will bring in tons of client-side
                                                                                          libraries that we don't need */
var roomNameTrimmer = require('../../../public/js/utils/room-name-trimmer');
var getSubResources = require('./sub-resources');
var generateMainFrameSnapshots = require('../../handlers/snapshots/main-frame');
var fonts = require('../../web/fonts');

function renderMainFrame(req, res, next, options) {
  var user = req.user;
  var userId = user && user.id;

  var selectedRoomId = req.troupe && req.troupe.id;

  Promise.all([
      contextGenerator.generateNonChatContext(req),
      restful.serializeTroupesForUser(userId),
      options.socialMetaDataPromise,
      restful.serializeOrgsForUserId(userId).catch(function(err) {
        // Workaround for GitHub outage
        winston.error('Failed to serialize orgs:' + err, { exception: err });
        return [];
      }),
      restful.serializeGroupsForUserId(userId),

    ])
    .spread(function (troupeContext, rooms, socialMetadata, orgs, groups) {
      var chatAppLocation = options.subFrameLocation;

      var template, bootScriptName;

      if (req.user) {
        template = 'app-template';
        bootScriptName = 'router-app';
      } else {
        template = 'app-nli-template';
        bootScriptName = 'router-nli-app';
      }

      var hasNewLeftMenu = !req.isPhone && req.fflip && req.fflip.has('left-menu');
      var extras = {
        suggestedMenuState: options.suggestedMenuState
      };
      var snapshots = troupeContext.snapshots = generateMainFrameSnapshots(req, troupeContext, rooms, groups, extras);

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
        troupeName:             options.title,
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
