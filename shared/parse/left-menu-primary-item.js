'use strict';

var _                       = require('underscore');
var urlJoin                 = require('url-join');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var roomNameShortener       = require('../room-name-shortener');
var parseRoomItemName       = require('../get-org-menu-state-name-from-troupe-name');

var clientEnv = require('gitter-client-env');

var AVATAR_SIZE = 22;

module.exports = function parseContentToTemplateData(data, state) {
  data.name = (data.name || data.uri || '');
  if(data.fromUser) {
    data.name = data.fromUser.username;
  }

  if(data.isSuggestion) {
    var sourceValue = state === 'all' ? 'all-rooms-list' : 'suggested-menu';
    data.uri = urlJoin(data.uri, '?source=' + sourceValue);
  }

  data.absoluteRoomUri = urlJoin(clientEnv.basePath, (data.uri || data.url));

  //For user results
  if (data.displayName) {
    return _.extend({}, {
      name:         roomNameShortener(data.displayName),
      avatarSrcset: resolveRoomAvatarSrcSet({ uri: data.username }, AVATAR_SIZE),
      absoluteRoomUri: data.absoluteRoomUri
    });
  }

  if(data.isRecentSearch || data.isSearchRepoResult) {
    var avatarSrcset = resolveRoomAvatarSrcSet({ uri: data.name }, AVATAR_SIZE);
    // No avatars on recent searches
    if(data.isRecentSearch) {
      avatarSrcset = null;
    }

    return _.extend({}, {
      name:         roomNameShortener(data.name),
      avatarSrcset: avatarSrcset,
    });
  }

  var hasMentions  = !!data.mentions && data.mentions;
  var unreadItems  = !hasMentions && data.unreadItems;

  // Make sure we are lurking and we only have activity so we don't override mentions or unread indicators
  var lurkActivity = !!data.activity && (!hasMentions && !unreadItems);

  var roomName = data.name;
  // Get rid of the org prefix, if viewing in a org bucket
  if(state === 'org') {
    roomName = parseRoomItemName(data.name);
  }

  var uri = data.uri || (data.url || '').substring(1) || data.name;
  return _.extend({}, data, {
    avatarSrcset:  resolveRoomAvatarSrcSet({ uri: uri }, AVATAR_SIZE),
    isNotOneToOne: (data.githubType !== 'ONETOONE'),
    name:          roomNameShortener(roomName),
    mentions:      hasMentions,
    unreadItems:   unreadItems,
    lurkActivity:  lurkActivity,
    isSearch:      (state === 'search'),
  });
};
