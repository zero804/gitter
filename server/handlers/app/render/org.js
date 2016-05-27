"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var Promise = require('bluebird');
var contextGenerator = require('../../../web/context-generator');
var userService = require('../../../services/user-service');
var roomMembershipService = require('../../../services/room-membership-service');
var troupeService = require('../../../services/troupe-service');
var _ = require('lodash');
var GitHubOrgService = require('gitter-web-github').GitHubOrgService;
var orgPermissionModel = require('gitter-web-permissions/lib/models/org-permissions-model');
var resolveUserAvatarUrl = require('gitter-web-shared/avatars/resolve-user-avatar-url');
var generateRoomCardContext = require('gitter-web-shared/templates/partials/room-card-context-generator');

/* How many chats to send back */

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

module.exports = exports = {
  renderOrgPage: renderOrgPage,
};
