"use strict";

var Promise = require('bluebird');
var _ = require('underscore');
var express = require('express');
var urlJoin = require('url-join');

var clientEnv = require('gitter-client-env');
var contextGenerator = require('../web/context-generator');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var featureToggles = require('../web/middlewares/feature-toggles');

var exploreService = require('../services/explore-service');
var suggestionsService = require('../services/suggestions-service');
var exploreTagUtils = require('../utils/explore-tag-utils');
var generateExploreSnapshot = require('./snapshots/explore-snapshot');
var fonts = require('../web/fonts');

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



var FAUX_TAG_MAP = {};
FAUX_TAG_MAP[exploreTagUtils.tagConstants.SUGGESTED_TAG_LABEL] = [exploreTagUtils.tagConstants.SUGGESTED_BACKEND_TAG];
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
  'Devops': ['devops'],
  'Game Dev': ['game'],
  'Frameworks': ['frameworks'],
  'JavaScript': ['javascript'],
  'Scala': ['scala'],
  'Ruby': ['ruby'],
  'CSS': ['css'],
  'Material Design': [],
  'React': ['react'],
  'Java': ['java'],
  'PHP': ['php'],
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
  featureToggles,
  function (req, res) {
    var inputTags = processTagInput(req.query.search);

    var defaultTags = firstTag.tags;
    // Default to suggested if logged in
    if(req.user) {
      defaultTags = [exploreTagUtils.tagConstants.SUGGESTED_TAG_LABEL.toLowerCase()];
    }

    var tagsToUse = [].concat((inputTags.length > 0 ? inputTags : defaultTags));
    var exploreTargetRedirectUrl = urlJoin(req.baseUrl, '/tags/' + tagsToUse.join(','));
    res.redirect(exploreTargetRedirectUrl);
  });

router.get('/tags/:tags',
  identifyRoute('explore-tags'),
  featureToggles,
  function(req, res, next) {
    contextGenerator.generateNonChatContext(req).then(function(troupeContext) {
      var user = troupeContext.user;
      var isLoggedIn = !!user;

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
          if(tag === exploreTagUtils.tagConstants.SUGGESTED_BACKEND_TAG) {
            hasSuggestedTag = true;
          }
        });

        return prev.concat(selectedTagMap[key].tags);
      }, []);

      return Promise.try(function() {
          if(!hasSuggestedTag || !isLoggedIn) return;

          return suggestionsService.findSuggestionsForUserId(user.id)
            .then(function(suggestedRooms) {
              if (!suggestedRooms || !suggestedRooms.length) return;

              return suggestedRooms.map(function(room) {
                room.tags = room.tags || [];
                room.tags.push(exploreTagUtils.tagConstants.SUGGESTED_BACKEND_TAG);
                return room;
              });
            });
        })
        .then(function(userSuggestions) {
          if (userSuggestions && userSuggestions.length) {
            return userSuggestions;
          }

          return exploreService.fetchByTags(selectedBackendTags);
        })
        .then(function(rooms) {
          var snapshots = generateExploreSnapshot({
            isLoggedIn: isLoggedIn,
            fauxTagMap: fauxTagMap,
            selectedTags: selectedTagsInput,
            rooms: rooms
          });

          return snapshots;
        })
        .then(function(snapshots) {
          // Anyone know why we're putting this on the
          // context? Probably not.
          troupeContext.snapshots = snapshots;

          res.render('explore', _.extend({}, snapshots, {
            exploreBaseUrl: req.baseUrl,
            troupeContext: troupeContext,
            isLoggedIn: isLoggedIn,
            createRoomUrl: urlJoin(clientEnv.basePath, '#createroom'),
            fonts: fonts.getFonts(),
            hasCachedFonts: fonts.hasCachedFonts(req.cookies),
          }));
        })
        .catch(next);
    });
  });

module.exports = router;
