/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var suggestedService = require('../services/suggested-room-service');
var repoDescription = require('../services/github/github-fast-repo-description');
var getRoughMessageCount = require('../services/chat-service').getRoughMessageCount;
var Q = require('q');

// @const
var DEFAULT_TAGS = ['javascript', 'ruby', 'php'].sort();

function trim(str) {
  return str.trim();
}

function getRoomRenderData(room) {
  return Q.all([
      room.githubType === 'REPO' ? repoDescription(room.uri) : room.topic,
      getRoughMessageCount(room.id)
    ])
    .spread(function(description, messageCount) {
      var roomNameParts = room.uri.split('/');

      return {
        room: room,
        owner: roomNameParts[0],
        roomNameParts: roomNameParts,
        description: description,
        messageCount: messageCount
      };
    });
}

function processTagResult(rooms) {
  return Q.all(rooms.map(getRoomRenderData));
}

function createResponseData(tags, rooms) {
  return {
    tags: tags.join(', '),
    rooms: rooms
  };
}

module.exports = {
  install: function (app) {

    // route to handle search only
    app.get('/explore/tags', function (req, res) {
      var search = req.query.search;
      var tags = (search) ? search.split(/[ ,]+/).map(trim).sort().join(',') : DEFAULT_TAGS.join(',');
      res.redirect('/explore/tags/' + tags);
    });

    app.get('/explore/tags/:tags', function (req, res, next) {
      var tags = req.params.tags.split(',');
      suggestedService.fetchByTags(tags)
        .then(processTagResult)
        .then(createResponseData.bind(null, tags))
        .then(function (data) {
          res.render('explore', data);
        })
        .fail(next);
    });
  }
};
