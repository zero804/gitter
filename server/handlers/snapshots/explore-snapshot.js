'use strict';

var _ = require('underscore');

var restSerializer = require('../../serializers/rest-serializer');
var generateRoomCardContext = require('gitter-web-shared/templates/partials/room-card-context-generator');
var getRoughMessageCount = require('../../services/chat-service').getRoughMessageCount;

var exploreTagUtils = require('../../utils/explore-tag-utils');


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
  isLoggedIn: false,
  fauxTagMap: {},
  selectedTags: [],
  rooms: []
};

module.exports = function getSnapshotsForPageContext(options) {
  var opts = _.extend({}, defaults, options);

  var tagMap = exploreTagUtils.generateTagMap(opts.fauxTagMap);
  if(!opts.isLoggedIn) {
    tagMap[exploreTagUtils.tagConstants.FAUX_KEY_TAG_MAP_KEY_PREFIX + ':suggested'].needsAuthentication = true;
  }
  var selectedTagMap = exploreTagUtils.generateSelectedTagMap(tagMap, opts.selectedTags);


  return restSerializer.serialize(opts.rooms, new restSerializer.SuggestedRoomStrategy())
    .then(function(rooms) {
      var resultantRooms = rooms.map(function(roomObj) {
        return generateRoomCardContext(roomObj);
      });

      return {
        tagMap: selectedTagMap,
        rooms: resultantRooms
      };
    });
};
