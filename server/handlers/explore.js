"use strict";

var Promise = require('bluebird');
var _ = require('underscore');
var langs = require('langs');
var express = require('express');
var contextGenerator = require('../web/context-generator');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

var exploreService = require('../services/explore-service');
var suggestionsService = require('../services/suggestions-service');
var exploreTagUtils = require('../utils/explore-tag-utils');
var generateExploreSnapshot = require('./snapshots/explore-snapshot');

var trim = function(str) {
  return str.trim();
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

var DEFAULT_TAGS = [SUGGESTED_TAG_LABEL.toLowerCase()];


var router = express.Router({ caseSensitive: true, mergeParams: true });

// This will redirect `/explore` to `/explore/DEFAULT_TAGS`
router.get('/:tags?',
  identifyRoute('explore-tags-redirect'),
  function (req, res) {
    var search = req.query.search;
    var tags = (search) ? search.split(/[ ,]+/).map(trim).sort().join(',') : [].concat(DEFAULT_TAGS).join(',');
    res.redirect('/explore/tags/' + tags);
  });


router.get('/tags/:tags',
  identifyRoute('explore-tags'),
  function (req, res, next) {
    contextGenerator.generateNonChatContext(req).then(function (troupeContext) {
      var user = troupeContext.user;
      var isStaff = !!(user || {}).staff;
      console.log('u', req.user, troupeContext.user);

      var selectedTagsInput = req.params.tags
        .split(',')
        .map(function(tag) {
          return tag.toLowerCase();
        })
        // We only take one selected tag
        .slice(0, 1);


      var tagMap = exploreTagUtils.generateTagMap(FAUX_TAG_MAP);
      var selectedTagMap = exploreTagUtils.getSelectedEntriesInTagMap(tagMap, selectedTagsInput);

      var selectedBackendTags = Object.keys(selectedTagMap).reduce(function(prev, key) {
        return prev.concat(selectedTagMap[key].tags);
      }, []);

      console.log('selectedBackendTags', selectedBackendTags);

      return exploreService.fetchByTags(selectedBackendTags)
        .then(function(prevRooms) {
          var getSuggestedRoomsPromise = Promise.resolve([]);
          if(user) {
            getSuggestedRoomsPromise = suggestionsService.findSuggestionsForUserId(user.id);
          }

          return getSuggestedRoomsPromise
            .then(function(suggestedRooms) {
              suggestedRooms = suggestedRooms || [];
              suggestedRooms = suggestedRooms.map(function(room) {
                room.tags.push(SUGGESTED_BACKEND_TAG);
                return room;
              });

              // If there are no suggestions, just get rid of that tag-pill
              if(suggestedRooms.length === 0) {
                delete FAUX_TAG_MAP[SUGGESTED_TAG_LABEL];
              }

              return suggestedRooms.concat(prevRooms);
            }, []);
        })
        .then(function(rooms) {
          var snapshot = generateExploreSnapshot({
            fauxTagMap: FAUX_TAG_MAP,
            selectedTags: selectedTagsInput,
            rooms: rooms
          });
          return snapshot;
        })
        .then(function(snapshot) {
          res.render('explore', _.extend({}, snapshot, {
            isLoggedIn: !!user
          }));
        })
        .catch(next);
    });
  });

module.exports = router;
