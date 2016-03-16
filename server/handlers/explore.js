"use strict";

var Promise = require('bluebird');
var _ = require('underscore');
var langs = require('langs');
var express = require('express');
var contextGenerator = require('../web/context-generator');
var exploreService = require('../services/explore-service');
var getRoughMessageCount = require('../services/chat-service').getRoughMessageCount;
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

var generateRoomCardContext = require('gitter-web-shared/templates/partials/room-card-context-generator');

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
      return {
        room: room,
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
    contextGenerator.generateNonChatContext(req).then(function (troupeContext) {
      var isStaff = !!(troupeContext.user || {}).staff;

      var selectedTags = req.params.tags.split(',');

      var fauxTagMap = {
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
        'JavaScript': 'javascript',
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
      var selectedTagMap = {};
      selectedTags.forEach(function(selectedTag) {
        var key = slugify(selectedTag);
        var fauxKey = 'faux-' + key;
        var fauxTagEntry = tagMap[fauxKey];
        if(fauxTagEntry && fauxTagEntry.tags.length === 1) {
          // This will update the tagMap and selectedTagMap
          fauxTagEntry.selected = true;
          selectedTagMap[fauxKey] = fauxTagEntry;
        }
        else {
          selectedTagMap[key] = {
            name: selectedTag,
            tags: [selectedTag],
            selected: true
          };
        }
      });

      // Put the selected tags at the front of the list
      var resultantTagMap = _.extend({}, selectedTagMap, tagMap);

      // Shove the tags into an array for the exploreService
      var allTags = Object.keys(resultantTagMap).reduce(function(result, tagKey) {
        return result.concat(resultantTagMap[tagKey].tags || []);
      }, []);

      return exploreService.fetchByTags(allTags)
        .then(processTagResult)
        .then(function(rooms) {
          rooms = rooms.map(function(roomObj) {
            return generateRoomCardContext(roomObj.room, {
              isStaff: isStaff,
              messageCount: roomObj.messageCount
            });
          });

          res.render('explore', {
            tagMap: resultantTagMap,
            rooms: rooms,
            isLoggedIn: !!req.user,
            // Room owners can also edit tags but
            // we don't worry about that on explore for perf
            canEditTags: isStaff
          });
        })
        .catch(next);
    });
  });

module.exports = router;
