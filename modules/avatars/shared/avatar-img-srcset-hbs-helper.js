'use strict';

function avatarImgSrcSetHbsHelper(avatarServerUrl, size) {
  if (!avatarServerUrl) {
    return " height='" + size + "' width='" + size + "' ";
  }

  var src = avatarServerUrl + '?s=' + size;
  var srcset = avatarServerUrl + '?s=' + (size * 2) + ' 2x';

  return " height='" + size + "' width='" + size + "' src='" + src + "' srcset='" + srcset + "' ";
}

module.exports = avatarImgSrcSetHbsHelper;
