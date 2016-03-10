"use strict";

var express = require('express');
var exploreService = require('../services/explore-service');
var getRoughMessageCount = require('../services/chat-service').getRoughMessageCount;
var Promise = require('bluebird');
var langs = require('langs');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

var slugify = function(str){
  return str
    .toLowerCase()
    .replace(/ +/g, '-')
    .replace(/[^-\w]/g, '');
};

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
  return Promise.all(rooms.map(getRoomRenderData));
}

var router = express.Router({ caseSensitive: true, mergeParams: true });

/* Seriously, wtf is this all about? */
router.get('/:tags?',
  identifyRoute('explore-tags-redirect'),
  function (req, res) {
    var search = req.query.search;
    var tags = (search) ? search.split(/[ ,]+/).map(trim).sort().join(',') : DEFAULT_TAGS.join(',');
    res.redirect('/explore/tags/' + tags);
  });


router.get('/tags/:tags',
  identifyRoute('explore-tags'),
  function (req, res, next) {
    var userTags = req.params.tags.split(',');
    var defaultTags = [
      'javascript',
      'php',
      'curated:frontend',
      'curated:ios & curated:android & objective-c',
      'curated:ios ',
      'curated:android',
      'curated:datascience',
      'curated:devops',
      'curated:gamedev & game',
      'frameworks',
      'scala',
      'ruby',
      'css',
      'curated:materialdesign',
      'react',
      'java',
      'swift',
      'go',
      'node & nodejs',
      'meteor',
      'django',
      'dotnet',
      'angular',
      'rails',
      'haskell'
    ];

    var combinedTags = userTags.concat(defaultTags)
    var tagMap = {};
    combinedTags.forEach(function(tag) {
      tagMap[slugify(tag)] = tag;
    });

    return exploreService.fetchByTags(combinedTags)
      .then(processTagResult)
      .then(function (rooms) {
        res.render('explore', {
          tagMap: tagMap,
          rooms: rooms,
          isLoggedIn: !!req.user
        });
      })
      .catch(next);
  });

module.exports = router;
