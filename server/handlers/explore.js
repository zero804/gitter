/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var suggestedService = require('../services/suggested-room-service');
var userService = require('../services/user-service');
var RepoService = require('../services/github/github-repo-service');
var roomNameTrimmer = require('../utils/room-name-trimmer');
var Q = require('q');

var DEFAULT_TAGS = ['javascript', 'ruby', 'php'];

function isActiveUser(user) {
  return user.state !== 'INVITED';
}

function getRoomRenderData(room, user) {
  var repoService = new RepoService(user);
  var userIds = room.users.map(function(user) { return user.userId; });
  return Q.all([
    repoService.getRepo(room.uri),
    userService.findByIds(userIds)
  ])
  .spread(function(repo, users) {
    return {
      room: room,
      repo: repo,
      shortName: roomNameTrimmer(room.uri),
      activeUsers: users.filter(isActiveUser)
    };
  });
}

function processTagResult(tag, rooms) {
  return Q.all(rooms.map(getRoomRenderData))
    .then(function(roomsWithExtraData) {
      return {
        tag: tag,
        rooms: roomsWithExtraData
      };
    });
}

function getRenderDataForTag(tag) {
  return suggestedService.getTaggedRooms(tag)
    .then(function(rooms) {
      return processTagResult(tag, rooms);
    });
}

module.exports = {
  install: function(app) {
    // app.get('/explore', function (req, res, next) {
    //   return Q.all(DEFAULT_TAGS.map(getRenderDataForTag))
    //     .then(function(tagRenderDataList) {
    //         res.render('explore', { tags: tagRenderDataList });
    //       })
    //       .fail(next);
    // });

    app.get('/explore/tags/:tag', function (req, res, next) {
      return getRenderDataForTag(req.params.tag, req.user)
        .then(function(tagRenderData) {
          res.render('explore', tagRenderData );
        })
        .fail(next);
    });
  }
};
