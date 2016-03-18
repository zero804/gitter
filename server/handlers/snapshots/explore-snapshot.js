'use strict';

var _ = require('underscore');

var restSerializer = require('../../serializers/rest-serializer');
var generateRoomCardContext = require('gitter-web-shared/templates/partials/room-card-context-generator');
var getRoughMessageCount = require('../services/chat-service').getRoughMessageCount;

var slugify = function(str){
  return str
    .toLowerCase()
    .replace(/ +/g, '-')
    .replace(/[^-\w]/g, '');
};


var generateTagMap = function(fauxTagMap, selectedTags) {

  // Generate the tagMap
  var tagMap = {};
  Object.keys(fauxTagMap).forEach(function(fauxKey) {
    // The tags driving the faux-tag
    var backendTags = [].concat(fauxTagMap[fauxKey]);
    // Add the primary backend tag to the front
    backendTags.unshift('curated:' + slugify(fauxKey));

    tagMap['faux-' + slugify(fauxKey)] = {
      name: fauxKey,
      tags: backendTags
    };
  });

  // Work out the selection
  var selectedTagMap = {};
  selectedTags.forEach(function(selectedTag) {
    var tagPortionMatches = selectedTag.match(/((?:(?:.*?):){0,})(.*)$/);
    var tagReservedPrefixPortion = tagPortionMatches[1];
    var tagMainPortion = tagPortionMatches[2];
    var key = slugify(tagMainPortion);

    // Only match to faux keys if we are using some special sauce or
    // the special `explore/tags/suggested` url
    var shouldUseFauxKey = tagReservedPrefixPortion.length > 0 || tagMainPortion === 'suggested';

    var fauxKey = 'faux-' + key;
    var fauxTagEntry = tagMap[fauxKey];
    if(shouldUseFauxKey && fauxTagEntry) {
      // This will update the tagMap and selectedTagMap
      fauxTagEntry.selected = true;
      selectedTagMap[fauxKey] = fauxTagEntry;
    }
    else {
      var newEntry = {
        name: selectedTag,
        tags: [selectedTag],
        selected: true
      };

      selectedTagMap[key] = newEntry;
    }
  });

  // Put the selected tags at the front of the list
  var resultantTagMap = _.extend({}, selectedTagMap, tagMap);

  return {
    tagMap: resultantTagMap,
    selectedTagMap: selectedTagMap
  };
}


function getAsyncRoomData(room) {
  return getRoughMessageCount(room.id)
    .then(function(messageCount) {
      return {
        room: room,
        messageCount: messageCount
      };
    });
}


var defaults = {
  fauxTagMap: {},
  selectedTags: [],
  rooms: []
};

module.exports = function getSnapshotsForPageContext(options) {
  var opts = _.extend({}, defaults, opts);

  var tagMap = generateTagMap(opts.fauxTagMap, opts.selectedTags);

  return restSerializer.serialize(opts.rooms, new restSerializer.SuggestedRoomStrategy())
    .then(function(rooms) {
      var resultantRooms = opts.rooms.map(function(roomObj) {
        return generateRoomCardContext(roomObj);
      });

      return {
        tagMap: tagMap,
        rooms: resultantRooms
      };
    });
};
