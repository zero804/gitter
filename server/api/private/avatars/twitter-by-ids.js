'use strict';

var TWITTER_AVATAR_PREFIX = 'https://pbs.twimg.com/profile_images/';

module.exports = function(id1, id2, extension, size) {
  // TODO: figure out the best size name from size param
  var sizeName = 'normal';
  return {
    url: TWITTER_AVATAR_PREFIX + id1 + '/' + id2 + '_' + sizeName + '.' + extension
  }
}
