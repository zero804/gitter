"use strict";

var Promise = require('bluebird');
var _ = require('underscore');
var langs = require('langs');
var express = require('express');
var urlJoin = require('url-join');

var troupeEnv = require('../web/troupe-env');
var contextGenerator = require('../web/context-generator');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

var exploreService = require('../services/explore-service');
var suggestionsService = require('../services/suggestions-service');
var exploreTagUtils = require('../utils/explore-tag-utils');
var generateExploreSnapshot = require('./snapshots/explore-snapshot');

var trim = function(str) {
  return str.trim();
};

var processTagInput = function(input) {
  input = input || '';
  var selectedTagsInput = input
    .split(',')
    .filter(function(inputItem) {
      return inputItem.trim().length > 0;
    })
    .map(function(tag) {
      return tag.toLowerCase();
    });

  return selectedTagsInput;
};


// @const
var SUGGESTED_TAG_LABEL = 'Suggested';
var SUGGESTED_BACKEND_TAG = 'generated:suggested';

var FAUX_TAG_MAP = {};
FAUX_TAG_MAP[SUGGESTED_TAG_LABEL] = [SUGGESTED_BACKEND_TAG];
_.extend(FAUX_TAG_MAP, {
  'Frontend': [],
  'Mobile': [
    'curated:ios',
    'curated:android',
    'objective-c'
  ],
  'iOS': [],
  'Android': [],
  'Data Science': [],
  'Devops': [],
  'Game Dev': ['game'],
  'Frameworks': ['frameworks'],
  'JavaScript': ['javascript'],
  'Scala': ['scala'],
  'Ruby': ['ruby'],
  'CSS': ['css'],
  'Material Design': [],
  'React': ['react'],
  'Java': ['java'],
  'Swift': ['swift'],
  'Go': ['go'],
  'Node': ['node', 'nodejs'],
  'Meteor': ['meteor'],
  'Django': ['django'],
  '.NET': ['dotnet'],
  'Angular': ['angular'],
  'Rails': ['rails'],
  'Haskell': ['haskell']
});


var router = express.Router({ caseSensitive: true, mergeParams: true });



// This will redirect `/explore` to `/explore/DEFAULT_TAGS`
var exploreRedirectStaticTagMap = exploreTagUtils.generateTagMap(FAUX_TAG_MAP);
var firstTag = exploreRedirectStaticTagMap[Object.keys(exploreRedirectStaticTagMap)[1]];
router.get('/:tags?',
  identifyRoute('explore-tags-redirect'),
  function (req, res) {
    var inputTags = processTagInput(req.query.search);

    var defaultTags = firstTag.tags;
    // Default to suggested if logged in
    if(req.user) {
      defaultTags = [SUGGESTED_TAG_LABEL.toLowerCase()];
    }

    var tagsToUse = [].concat((inputTags.length > 0 ? inputTags : defaultTags));
    var exploreTargetRedirectUrl = urlJoin(req.baseUrl, '/tags/' + tagsToUse.join(','));
    res.redirect(exploreTargetRedirectUrl);
  });

router.get('/tags/:tags',
  identifyRoute('explore-tags'),
  function(req, res, next) {
    contextGenerator.generateNonChatContext(req).then(function(troupeContext) {
      var user = troupeContext.user;
      var isStaff = !!(user || {}).staff;
      //console.log('u', req.user, troupeContext.user);

      // Copy so we can modify later on
      var fauxTagMap = _.extend({}, FAUX_TAG_MAP);

      var selectedTagsInput = processTagInput(req.params.tags)
        // We only take one selected tag
        .slice(0, 1);

      // We only generate the tag map here to grab the list of selected tags so
      // we can populate our rooms from the explore service
      var tagMap = exploreTagUtils.generateTagMap(fauxTagMap);
      var selectedTagMap = exploreTagUtils.getSelectedEntriesInTagMap(tagMap, selectedTagsInput);

      var hasSuggestedTag = false;
      // Mush into an array of selected tags
      var selectedBackendTags = Object.keys(selectedTagMap).reduce(function(prev, key) {
        // Check for the selected tag for easy reference later
        selectedTagMap[key].tags.forEach(function(tag) {
          if(tag === SUGGESTED_BACKEND_TAG) {
            hasSuggestedTag = true;
          }
        });

        return prev.concat(selectedTagMap[key].tags);
      }, []);


      var getSuggestedRoomsPromise = Promise.resolve()
        .then(function() {
          if(hasSuggestedTag && user) {
            return suggestionsService.findSuggestionsForUserId(user.id)
              .then(function(suggestedRooms) {
                suggestedRooms = suggestedRooms || [];
                suggestedRooms = suggestedRooms.map(function(room) {
                  room.tags.push(SUGGESTED_BACKEND_TAG);
                  return room;
                });

                return suggestedRooms;
              }, []);
          }

          return [];
        })
        .then(function(suggestedRooms) {
          // If there are no suggestions, just get rid of that tag-pill
          if(suggestedRooms.length === 0) {
            delete fauxTagMap[SUGGESTED_TAG_LABEL];
          }

          return suggestedRooms;
        });

      var getExploreRoomsPromise = getSuggestedRoomsPromise.then(function(suggestedRooms) {
        if(suggestedRooms.length === 0) {
          return exploreService.fetchByTags(selectedBackendTags);
        }

        return [];
      });


      var gatherRoomsPromises = [
        getSuggestedRoomsPromise,
        getExploreRoomsPromise
      ];

      return Promise.all(gatherRoomsPromises)
        .then(function(roomResults) {
          // Mush the results into one array
          return roomResults.reduce(function(prev, rooms) {
            return prev.concat(rooms);
          }, []);
        })
        .then(function(rooms) {
          var snapshots = generateExploreSnapshot({
            fauxTagMap: fauxTagMap,
            selectedTags: selectedTagsInput,
            rooms: rooms
          });
          return snapshots;
        })
        .then(function(snapshots) {
          troupeContext.snapshots = snapshots;
          res.render('explore', _.extend({}, snapshots, {
            exploreBaseUrl: req.baseUrl,
            troupeContext: troupeContext,
            isLoggedIn: !!user,
            createRoomUrl: urlJoin(troupeEnv.basePath, '#createroom')
          }));
        })
        .catch(next);
    });
  });

module.exports = router;
