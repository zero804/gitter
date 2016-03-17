'use strict';

var _ = require('underscore');
var resolveRoomAvatarSrcSet = require('../../avatars/resolve-room-avatar-srcset');
var validateTag = require('gitter-web-shared/validation/validate-tag');

// via https://gist.github.com/cho45/9968462
function formatNumberWithSiPrefix(n) {
	var nn = n.toExponential(2).split(/e/);
	var u = Math.floor(+nn[1] / 3);
	return nn[0] * Math.pow(10, +nn[1] - u * 3) + ['p', 'n', 'u', 'm', '', 'k', 'M', 'G', 'T'][u + 4];
}

var defaults = {
  isStaff: false,
  messageCount: false
};

// generateRoomCardContext
module.exports = function(room, options) {
  var opts = _.extend({}, defaults, options);
  var roomObj = _.extend({}, room.toJSON());

  roomObj.isPrivate = roomObj.security !== 'PUBLIC';
  roomObj.canEditTags = opts.isStaff;
  roomObj.roomNameParts = roomObj.uri.split('/');
  roomObj.roomAvatarSrcSet = resolveRoomAvatarSrcSet({ uri: roomObj.lcUri }, 40);
  if(opts.messageCount) {
    roomObj.messageCountSiPrefixed = formatNumberWithSiPrefix(opts.messageCount);
  }
  roomObj.displayTags = (roomObj.tags || []).filter(function(tag) {
    return validateTag(tag, opts.isStaff).isValid;
  });

  //console.log('ro', roomObj);

  return roomObj;
};
