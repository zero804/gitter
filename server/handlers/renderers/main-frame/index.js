"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var statsd = env.createStatsClient({ prefix: nconf.get('stats:statsd:prefix')});
var Promise = require('bluebird');
var contextGenerator = require('../../../web/context-generator');
var restful = require('../../../services/restful');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

var getSubResources = require('../sub-resources');
var getMainFrameSnapshots = require('./snapshots');
var fonts = require('../../../web/fonts');
var generateLeftMenuStateForUriContext = require('./generate-left-menu-state-for-uri-context');
var getOldLeftMenuViewData = require('./get-old-left-menu-view-data');
var getLeftMenuViewData = require('./get-left-menu-view-data');
var generateUserThemeSnapshot = require('../../snapshots/user-theme-snapshot');

function getTroupeContextAndDerivedInfo(req, leftMenu, socialMetadataGenerator) {
  return contextGenerator.generateMainMenuContext(req, leftMenu)
    .bind({
      troupeContext: null,
      socialMetadata: null,
    })
    .then(function(troupeContext) {
      this.troupeContext = troupeContext;

      return socialMetadataGenerator && socialMetadataGenerator(troupeContext);
    })
    .then(function(socialMetadata) {
      this.socialMetadata = socialMetadata;

      return this;
    });
}

function renderMainFrame(req, res, next, options) {
  var user = req.user;
  var userId = user && user.id;
  var socialMetadataGenerator = options.socialMetadataGenerator;
  var selectedRoomId = req.troupe && req.troupe.id;
  var suggestedMenuState = options.suggestedMenuState;
  var uriContext = req.uriContext;

  // First thing: figure out the state we're planning on rendering...
  return generateLeftMenuStateForUriContext(userId, uriContext, suggestedMenuState)
    .bind({
      leftMenu: null
    })
    .then(function(leftMenu) {
      this.leftMenu = leftMenu;
      return [
        getTroupeContextAndDerivedInfo(req, leftMenu, socialMetadataGenerator),
        restful.serializeTroupesForUser(userId),
        restful.serializeGroupsForUserId(userId),
        generateUserThemeSnapshot(req),
      ];
    })
    .spread(function(troupeContextAndDerivedInfo, rooms, groups, userThemeSnapshot) {
      var troupeContext = troupeContextAndDerivedInfo.troupeContext;
      var socialMetadata = troupeContextAndDerivedInfo.socialMetadata;
      var chatAppLocation = options.subFrameLocation;

      var template, bootScriptName;

      if (req.user) {
        template = 'app-template';
        bootScriptName = 'router-app';
      } else {
        template = 'app-nli-template';
        bootScriptName = 'router-nli-app';
      }

      var leftMenu = this.leftMenu;

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

      // Add snapshots into the troupeContext
      troupeContext.snapshots = getMainFrameSnapshots({
        leftMenu: leftMenu,
        rooms: rooms,
        groups: groups
      });

      // Generate `gitter.web.prerender-left-menu` events
      statsd.increment('prerender-left-menu', 1, 0.25, [
        'state:' + leftMenu.state,
        'pinned:' + (leftMenu.roomMenuIsPinned ? '1' : '0')
      ]);

      res.render(template, {
        hasDarkTheme: userThemeSnapshot.theme === 'gitter-dark',
        leftMenu: getLeftMenuViewData({
          leftMenu: leftMenu,
          rooms: rooms,
          groups: groups
        }),
        oldLeftMenu: getOldLeftMenuViewData({
          rooms: rooms
        }),
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
        user:                   user,
        isPhone:                req.isPhone
      });

      return null;
    })
    .catch(next);
}


function renderMobileMainFrame(req, res, next, options) {
  var socialMetadataGenerator = options.socialMetadataGenerator;

  contextGenerator.generateMainMenuContext(req)
    .then(function(troupeContext) {
      return Promise.all([
        Promise.resolve(troupeContext),
        socialMetadataGenerator && socialMetadataGenerator(troupeContext)
      ]);
    })
    .spread(function(troupeContext, socialMetadata) {
      var bootScriptName = 'router-mobile-app';

      res.render('mobile/mobile-app', {
        troupeContext: troupeContext,
        fonts: fonts.getFonts(),
        hasCachedFonts: fonts.hasCachedFonts(req.cookies),
        socialMetadata: socialMetadata,
        subresources: getSubResources(bootScriptName),
        bootScriptName: bootScriptName,
        title: options.title,
        subFrameLocation: options.subFrameLocation
      });
    })
    .catch(next);
}

module.exports = exports = {
  renderMainFrame: renderMainFrame,
  renderMobileMainFrame: renderMobileMainFrame
};
