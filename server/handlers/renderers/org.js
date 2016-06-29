"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var Promise = require('bluebird');
var contextGenerator = require('../../web/context-generator');
var userService = require('../../services/user-service');
var roomMembershipService = require('../../services/room-membership-service');
var troupeService = require('../../services/troupe-service');
var _ = require('lodash');
var GitHubOrgService = require('gitter-web-github').GitHubOrgService;
var resolveUserAvatarUrl = require('gitter-web-shared/avatars/resolve-user-avatar-url');
var generateRoomCardContext = require('gitter-web-shared/templates/partials/room-card-context-generator');
var StatusError = require('statuserror');
var fonts = require('../../web/fonts');

function renderOrgPage(req, res, next) {
  if (!req.group) throw new StatusError(404);
  var policy = req.uriContext.policy;

  var findChildRoomOptions = {};

  var ROOMS_PER_PAGE = 15;

  // Show only public rooms to not logged in users
  if (!req.user) findChildRoomOptions.security = 'PUBLIC';

  var ghOrgService = new GitHubOrgService(req.user);

  // TODO: fix this!!!
  var orgUri = req.group.uri;

  return Promise.all([
    ghOrgService.getOrg(orgUri).catch(function() { return null; }),
    troupeService.findChildRoomsForOrg(orgUri, findChildRoomOptions),
    contextGenerator.generateNonChatContext(req),
    policy.canAdmin(),
    policy.canJoin()
  ])
  .spread(function(ghOrg, rooms, troupeContext, isOrgAdmin, isOrgMember) {
    var isStaff = req.user && req.user.staff;

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

      var fullUri = nconf.get('web:basepath') + "/orgs/" + orgUri + "/rooms";
      var text = encodeURIComponent('Explore our chat community on Gitter:');
      var url = 'https://twitter.com/share?' +
        'text=' + text +
        '&url=' + fullUri +
        '&related=gitchat' +
        '&via=gitchat';

      res.render('org-page', {
        hasCachedFonts: fonts.hasCachedFonts(req.cookies),
        fonts: fonts.getFonts(),
        socialUrl: url,
        isLoggedIn: !!req.user,
        exploreBaseUrl: '/home/~explore',
        roomCount: roomCount,
        orgUserCount: orgUserCount,
        org: ghOrg || {
          login: orgUri
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

module.exports = exports = {
  renderOrgPage: renderOrgPage,
};
