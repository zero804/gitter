'use strict';

var clientEnv = require('gitter-client-env');
var Promise = require('bluebird');
var StatusError = require('statuserror');
var avatars = require('gitter-web-avatars');
var fonts = require('../../web/fonts');
var getTopicsFilterSortOptions = require('gitter-web-topics/lib/get-topics-filter-sort-options');
var restSerializer = require('../../serializers/rest-serializer');

var contextGenerator = require('../../web/context-generator');
var generateRoomCardContext = require('gitter-web-shared/templates/partials/room-card-context-generator');
var userService = require('../../services/user-service');
var groupBrowserService = require('gitter-web-groups/lib/group-browser-service');
var roomMembershipService = require('../../services/room-membership-service');
var forumService = require('gitter-web-topics/lib/forum-service');

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
      var strategy = restSerializer.TroupeStrategy.createSuggestionStrategy();

      return restSerializer.serialize(roomBrowseResult.results, strategy)
        .then(function(serializedRooms) {
          roomBrowseResult.results = serializedRooms;
          return roomBrowseResult;
        });
    });
}

function getRooms(groupId, user, currentPage) {
  return findRooms(groupId, user, currentPage)
    .then(function(roomBrowseResult) {
      var rooms = roomBrowseResult.results;
      // Add `room.users`
      return Promise.all(rooms.map(function(room) {
        return roomMembershipService.findMembersForRoom(room.id, { limit: 5 })
          .then(function(userIds) {
            return userService.findByIds(userIds);
          })
          .then(function(users) {
            room.users = users.map(function(user) {
              user.avatarUrl = avatars.getForUser(user);
              return user;
            });
            return room;
          });
      }))
      .then(function() {
        return roomBrowseResult;
      });
    });
}

function getForumForGroup(groupUri, forumId, userId) {
  return forumService.findById(forumId)
    .then(function(forum) {
      var strategy = restSerializer.ForumStrategy.nested({
        groupUri: groupUri,
        currentUserId: userId,
        topicsFilterSort: getTopicsFilterSortOptions({
          // TODO: Use a filter for created within the last week
          sort: 'likesTotal',
          limit: 3
        })
      });

      return restSerializer.serializeObject(forum, strategy);
    })
    .then(function(serializedForum) {
      if(serializedForum && serializedForum.topics) {
        serializedForum.topics = serializedForum.topics.map(function(topic) {
          topic.url = clientEnv.basePath + '/' + groupUri + '/topics/topic/' + topic.id + '/' + topic.slug;
          return topic;
        });
      }

      return serializedForum;
    })
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
      getRooms(groupId, user, currentPage),
      getForumForGroup(group.uri, group.forumId, user && user.id),
      contextGenerator.generateNonChatContext(req),
      policy.canAdmin(),
      function(serializedGroup, roomBrowseResult, serializedForum, troupeContext, isOrgAdmin) {
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

        var fullUri = clientEnv.basepath + '/orgs/' + serializedGroup.uri + '/rooms';
        var text = encodeURIComponent('Explore our chat community on Gitter:');
        var url = 'https://twitter.com/share?' +
          'text=' + text +
          '&url=' + fullUri +
          '&related=gitchat' +
          '&via=gitchat';

        var topicsUrl = clientEnv.basepath + '/' + serializedGroup.uri + '/topics';
        var createTopicUrl = clientEnv.basepath + '/' + serializedGroup.uri + '/topics/create-topic';

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
          forum: serializedForum,
          topicsUrl: topicsUrl,
          createTopicUrl: createTopicUrl,
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
