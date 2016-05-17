'use strict';

var _ = require('underscore');
var resolveRoomAvatarSrcSet = require('../../avatars/resolve-room-avatar-srcset');
var validateTag = require('../../validation/validate-tag').validateTag;

// via http://stackoverflow.com/a/17633552/796832
var ranges = [
  { divider: 1e18, suffix: 'P' },
  { divider: 1e15, suffix: 'E' },
  { divider: 1e12, suffix: 'T' },
  { divider: 1e9, suffix: 'G' },
  { divider: 1e6, suffix: 'M' },
  { divider: 1e3, suffix: 'k' }
];
var formatNumberWithSiPrefix = function(n) {
  for (var i = 0; i < ranges.length; i++) {
    if (n >= ranges[i].divider) {
      var siValue = n / ranges[i].divider;
      return (Math.round(siValue * 10) / 10).toString() + ranges[i].suffix;
    }
  }
  return n.toString();
};


var defaults = {
  isStaff: false
};

// generateRoomCardContext
module.exports = function(room, options) {
  var opts = _.extend({}, defaults, options);
  var result = _.extend({}, room);

  result.isPrivate = result.security !== 'PUBLIC' && result.security !== null && result.security !== undefined;
  result.canEditTags = opts.isStaff;
  result.roomNameParts = result.uri.split('/');
  result.topic = room.topic || room.description;
  result.roomAvatarSrcSet = resolveRoomAvatarSrcSet({ uri: result.uri }, 40);
  if(room.messageCount) {
    result.messageCountSiPrefixed = formatNumberWithSiPrefix(room.messageCount);
  }
  result.displayTags = (result.tags || []).filter(function(tag) {
    return validateTag(tag, opts.isStaff).isValid;
  });

  return result;
};
