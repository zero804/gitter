/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var suggestedService = require('../services/suggested-room-service');
var RepoService = require('../services/github/github-repo-service');
var Q = require('q');

var DEFAULT_TAGS = ['javascript', 'ruby', 'php'];

function getRoomRenderData(room, user) {
  var repoService = new RepoService(user);
  return repoService.getRepo(room.uri)
    .then(function(repo) {
      return {
        room: room,
        repo: repo
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
