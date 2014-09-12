/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var suggestedService = require('../services/suggested-room-service');
var userService = require('../services/user-service');
var Q = require('q');

var DEFAULT_TAGS = ['gitter', 'test', 'repo'];

function isActiveUser(user) {
  return user.state !== 'INVITED';
}

function getRoomRenderData(room) {
  var userIds = room.users.map(function(user) { return user.userId; });
  return userService.findByIds(userIds)
    .then(function(users) {
      return {
        room: room,
        owner: room.uri.split('/')[0],
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
    app.get('/explore', function (req, res, next) {
      return Q.all(DEFAULT_TAGS.map(getRenderDataForTag))
        .then(function(tagRenderDataList) {
            res.render('explore', { tags: tagRenderDataList });
          })
          .fail(next);
    });

    app.get('/explore/tags/:tag', function (req, res, next) {
      return getRenderDataForTag(req.params.tag)
        .then(function(tagRenderData) {
          console.log(tagRenderData);
          res.render('explore', { tags: [tagRenderData] });
        })
        .fail(next);
    });
  }
};
