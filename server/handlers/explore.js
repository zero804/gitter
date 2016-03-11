"use strict";

var Promise = require('bluebird');
var _ = require('underscore');
var langs = require('langs');
var express = require('express');
var exploreService = require('../services/explore-service');
var getRoughMessageCount = require('../services/chat-service').getRoughMessageCount;
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

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
    var selectedTags = req.params.tags.split(',');

    var fauxTagMap = {
      'JavaScript': 'javascript',
      'PHP': 'php',
      'Frontend': ['curated:frontend'],
      'Mobile': [
        'curated:ios',
        'curated:android',
        'objective-c'
      ],
      'iOS': ['curated:ios'],
      'Android': ['curated:android'],
      'Data Science': ['curated:datascience'],
      'Devops': ['curated:devops'],
      'Game Dev': ['curated:gamedev', 'game'],
      'Frameworks': ['frameworks'],
      'Scala': 'scala',
      'Ruby': 'ruby',
      'CSS': 'css',
      'Material Design': ['curated:materialdesign'],
      'React': 'react',
      'Java': 'java',
      'Swift': 'swift',
      'Go': 'go',
      'Node': ['node', 'nodejs'],
      'Meteor': 'meteor',
      'Django': 'django',
      '.NET': 'dotnet',
      'Angular': 'angular',
      'Rails': 'rails',
      'Haskell': 'haskell'
    };

    // Generate the tagMap
    var tagMap = {};
    Object.keys(fauxTagMap).forEach(function(fauxKey) {
      // The tags driving the faux-tag
      var backendTags = [].concat(fauxTagMap[fauxKey]);

      tagMap['faux-' + slugify(fauxKey)] = {
        name: fauxKey,
        tags: backendTags
      };
    });

    // Work out the selection
    selectedTags.forEach(function(selectedTag) {
      var fauxKey = 'faux-' + slugify(selectedTag);
      var fauxTagEntry = tagMap[fauxKey];
      if(fauxTagEntry.tags.length === 1) {
        tagMap[fauxKey].selected = true;
      }
      else {
        tagMap[slugify(selectedTag)] = {
          name: selectedTag,
          tags: selectedTag,
          selected: true
        };
      }
    });



    var allTags = Object.keys(tagMap).reduce(function(result, tagKey) {
      return result.concat(tagMap[tagKey].tags || []);
    }, []);

    return exploreService.fetchByTags(allTags)
      .then(processTagResult)
      .then(function (rooms) {
        rooms = rooms.map(function(roomObj) {
          roomObj.roomAvatarSrcSet = resolveRoomAvatarSrcSet({ uri: roomObj.room.lcUri }, 40);
          return roomObj;
        });

        res.render('explore', {
          tagMap: tagMap,
          rooms: rooms,
          isLoggedIn: !!req.user
        });
      })
      .catch(next);
  });

module.exports = router;
