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
  messageCount: undefined
};

// generateRoomCardContext
module.exports = function(room, options) {
  var opts = _.extend({}, defaults, options);
  var result = _.extend({}, room);

  result.isPrivate = result.security !== 'PUBLIC';
  result.canEditTags = opts.isStaff;
  result.roomNameParts = result.uri.split('/');
  result.roomAvatarSrcSet = resolveRoomAvatarSrcSet({ uri: result.lcUri }, 40);
  console.log(result.name, opts.messageCount);
  if(opts.messageCount) {
    result.messageCountSiPrefixed = formatNumberWithSiPrefix(opts.messageCount);
  }
  result.displayTags = (result.tags || []).filter(function(tag) {
    return validateTag(tag, opts.isStaff).isValid;
  });

  //console.log('ro', result);

  return result;
};
