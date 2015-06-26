/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var exploreService = require('../services/explore-service');
var getRoughMessageCount = require('../services/chat-service').getRoughMessageCount;
var Q = require('q');
var langs = require('langs');

// @const
var DEFAULT_TAGS = ['javascript', 'php', 'ruby'];

function trim(str) {
  return str.trim();
}

function getRoomRenderData(room) {
  return getRoughMessageCount(room.id)
    .then(function(messageCount) {
      var roomNameParts = room.uri.split('/');

      return {
        room: room,
        owner: roomNameParts[0],
        roomNameParts: roomNameParts,
        description: room.topic,
        messageCount: messageCount
      };
    });
}

function processTagResult(rooms) {
  return Q.all(rooms.map(getRoomRenderData));
}

function getSearchName(tags) {
  return tags.map(function(tag) {
    var m = /^lang:(\w+)/.exec(tag);
    if(!m || !m[1]) return tag;

    var lang = langs.where("1", m[1]);
    if(!lang || !lang.local) return m[1];

    return lang.local;
  });
}


module.exports = {
  install: function (app) {

    // route to handle search only
    app.get('/explore/(tags)?', function (req, res) {
      var search = req.query.search;
      var tags = (search) ? search.split(/[ ,]+/).map(trim).sort().join(',') : DEFAULT_TAGS.join(',');
      res.redirect('/explore/tags/' + tags);
    });

    app.get('/explore/tags/:tags', function (req, res, next) {
      var tags = req.params.tags.split(',');
      exploreService.fetchByTags(tags)
        .then(processTagResult)
        .then(function (rooms) {
          var searchNames = getSearchName(tags);
          res.render('explore', {
            tags: tags.join(', '),
            searchName: searchNames.join(', '),
            rooms: rooms,
            isLoggedIn: !!req.user
          });
        })
        .fail(next);
    });
  }
};
