"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var statsd = env.createStatsClient({ prefix: nconf.get('stats:statsd:prefix')});
var Promise = require('bluebird');
var contextGenerator = require('../../../web/context-generator');
var restful = require('../../../services/restful');
var forumCategoryService = require('gitter-web-topics').forumCategoryService;
var groupService = require('gitter-web-groups');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

var getSubResources = require('../sub-resources');
var getMainFrameSnapshots = require('./snapshots');
var fonts = require('../../../web/fonts');
var generateLeftMenuStateForUriContext = require('./generate-left-menu-state-for-uri-context');
var getOldLeftMenuViewData = require('./get-old-left-menu-view-data');
var getLeftMenuViewData = require('./get-left-menu-view-data');
var generateProfileMenuSnapshot = require('../../snapshots/profile-menu-snapshot');

function getLeftMenuForumGroupInfo(leftMenuGroupId) {
  return groupService.findById(leftMenuGroupId)
    .then(function(group) {
      var forumId = group && group.forumId;

      return Promise.props({
        group: group,
        forumCategories: forumId && forumCategoryService.findByForumId(forumId)
      });
    });
}

function getTroupeContextAndDerivedInfo(req, leftMenu, socialMetadataGenerator) {
  return contextGenerator.generateMainMenuContext(req, leftMenu)
    .bind({
      troupeContext: null,
      socialMetadata: null,
      leftMenuGroup: null,
      leftMenuGroupForumCategories: null
    })
    .then(function(troupeContext) {
      this.troupeContext = troupeContext;

      var leftMenuGroupId = leftMenu.groupId;

      return [
        socialMetadataGenerator && socialMetadataGenerator(troupeContext),
        leftMenuGroupId && getLeftMenuForumGroupInfo(leftMenuGroupId),
      ];
    })
    .spread(function(socialMetadata, leftMenuGroupInfo) {
      this.socialMetadata = socialMetadata;

      if (leftMenuGroupInfo) {
        this.leftMenuGroup = leftMenuGroupInfo.group;
        this.leftMenuGroupForumCategories = leftMenuGroupInfo.forumCategories;
      }

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
        generateProfileMenuSnapshot(req),
      ];
    })
    .spread(function(troupeContextAndDerivedInfo, rooms, groups, profileMenuSnapshot) {
      var troupeContext = troupeContextAndDerivedInfo.troupeContext;
      var socialMetadata = troupeContextAndDerivedInfo.socialMetadata;
      var leftMenuForumGroup = troupeContextAndDerivedInfo.leftMenuGroup;
      var leftMenuForumGroupCategories = troupeContextAndDerivedInfo.leftMenuGroupForumCategories;
      var chatAppLocation = options.subFrameLocation;
      profileMenuSnapshot = (profileMenuSnapshot || {});

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
        groups: groups,
        leftMenuForumGroup: leftMenuForumGroup,
        leftMenuForumGroupCategories: leftMenuForumGroupCategories
      });

      // Generate `gitter.web.prerender-left-menu` events
      statsd.increment('prerender-left-menu', 1, 0.25, [
        'state:' + leftMenu.state,
        'pinned:' + (leftMenu.roomMenuIsPinned ? '1' : '0')
      ]);

      res.render(template, {
        hasDarkTheme: profileMenuSnapshot.hasDarkTheme,
        leftMenu: getLeftMenuViewData({
          leftMenu: leftMenu,
          rooms: rooms,
          groups: groups,
          leftMenuForumGroup: leftMenuForumGroup,
          leftMenuForumGroupCategories: leftMenuForumGroupCategories
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
