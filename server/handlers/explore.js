"use strict";

var Promise = require('bluebird');
var _ = require('underscore');
var langs = require('langs');
var express = require('express');
var contextGenerator = require('../web/context-generator');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

var exploreService = require('../services/explore-service');
var suggestionsService = require('../services/suggestions-service');
var generateExploreSnapshot = require('./explore-snapshot');

var trim = function(str) {
  return str.trim();
};


// @const
var DEFAULT_TAGS = ['suggested'];

var suggestedFauxTag = 'generated:suggested';
var fauxTagMap = {
  'Suggested': [suggestedFauxTag],
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
};


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
      var user = troupeContext.user;
      var isStaff = !!(user || {}).staff;
      console.log('u', req.user, troupeContext.user);

      var selectedTags = req.params.tags
        .split(',')
        .map(function(tag) {
          return tag.toLowerCase();
        })
        // We only take one selected tag
        .slice(0, 1);




      return exploreService.fetchByTags(selectedTags)
        .then(function(prevRooms) {
          var getSuggestedRoomsPromise = Promise.resolve([]);
          if(user) {
            getSuggestedRoomsPromise = suggestionsService.findSuggestionsForUserId(user.id);
          }

          return getSuggestedRoomsPromise
            .then(function(rooms) {
              rooms = rooms || [];
              rooms = rooms.map(function(room) {
                room.tags.push(suggestedFauxTag);

                return room;
              });

              return rooms.concat(prevRooms);
            }, []);
        })
        .then(function(rooms) {
          var snapshot = generateExploreSnapshot({
            fauxTagMap: fauxTagMap,
            selectedTags: selectedTags,
            rooms: rooms
          });

          res.render('explore', _.extend({}, snapshot, {
            isLoggedIn: !!user
          }));
        })
        .catch(next);
    });
  });

module.exports = router;
