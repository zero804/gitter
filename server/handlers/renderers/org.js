"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var Promise = require('bluebird');
var contextGenerator = require('../../web/context-generator');
var generateRoomCardContext = require('gitter-web-shared/templates/partials/room-card-context-generator');
var StatusError = require('statuserror');
var fonts = require('../../web/fonts');
var restSerializer = require('../../serializers/rest-serializer');
var groupBrowserService = require('gitter-web-groups/lib/group-browser-service');

var ROOMS_PER_PAGE = 15;

function serializeGroup(group, user) {
  var userId = user && user._id;

  var strategy = new restSerializer.GroupStrategy({
    currentUser: user,
    currentUserId: userId
  });

  return restSerializer.serializeObject(group, strategy);
}

function findRooms(groupId, user, currentPage) {
  var userId = user && user._id;

  var skip = (currentPage - 1) * ROOMS_PER_PAGE;
  if (skip > 2000) throw new StatusError(400);

  return groupBrowserService.findRoomsWithPagination(groupId, userId, {
      skip: skip,
      limit: ROOMS_PER_PAGE
    })
    .then(function(roomBrowseResult) {
      var strategy = new restSerializer.SuggestedRoomStrategy({
        currentUserId: userId,
        currentUser: user
      });

      return restSerializer.serialize(roomBrowseResult.results, strategy)
        .then(function(serializedRooms) {
          roomBrowseResult.results = serializedRooms;
          return roomBrowseResult;
        });
    });
}

function renderOrgPage(req, res, next) {
  return Promise.try(function() {
    var group = req.group;
    if (!group) throw new StatusError(404);
    var groupId = group._id;
    var user = req.user;
    var policy = req.uriContext.policy;

    var currentPage = Math.max(parseInt(req.query.page, 10) || 1, 1);

    return Promise.join(
      serializeGroup(group, user),
      findRooms(groupId, user, currentPage),
      contextGenerator.generateNonChatContext(req),
      policy.canAdmin(),
      function(serializedGroup, roomBrowseResult, troupeContext, isOrgAdmin) {
        var isStaff = req.user && req.user.staff;
        var editAccess = isOrgAdmin || isStaff;
        var orgUserCount = roomBrowseResult.totalUsers;
        var roomCount = roomBrowseResult.total;

        // Calculate total pages
        var pageCount = Math.ceil(roomCount / ROOMS_PER_PAGE);
        var rooms = roomBrowseResult.results.map(function(room) {
          var result = generateRoomCardContext(room, {
            isStaff: editAccess
          });

          // No idea why this is called `isStaff`
          result.isStaff = editAccess;

          return result;
        });

        // This is used to track pageViews in mixpanel
        troupeContext.isCommunityPage = true;

        var fullUri = nconf.get('web:basepath') + "/orgs/" + serializedGroup.uri + "/rooms";
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
          group: serializedGroup,
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
