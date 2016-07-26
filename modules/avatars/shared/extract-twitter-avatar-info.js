'use strict';

var TWITTER_AVATAR_PREFIX = 'https://pbs.twimg.com/profile_images/';

/*
Take a twitter profile image like:
https://pbs.twimg.com/profile_images/378800000308609669/c5cc5261cc55da2dbca442eaf60920cc_normal.jpeg

And return the significant parts:
{
  id1: '378800000308609669',
  id2: 'c5cc5261cc55da2dbca442eaf60920cc',
  extension: 'jpeg'
}
*/
function extractTwitterAvatarInfo(twitterUrl) {
  if (twitterUrl.indexOf(TWITTER_AVATAR_PREFIX) !== 0) {
    // doesn't look like a twitter profile pic
    return null;
  }
  var rest = twitterUrl.slice(TWITTER_AVATAR_PREFIX.length);
  var ids = rest.slice(0, rest.indexOf('_'));
  return {
    id1: ids.slice(0, ids.indexOf('/')),
    id2: ids.slice(ids.indexOf('/')+1),
    extension: rest.slice(rest.indexOf('.')+1)
  }
}

module.exports = extractTwitterAvatarInfo;
