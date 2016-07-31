/* eslint complexity: ["error", 16] */
'use strict';

var _ = require('underscore');
var urlJoin = require('url-join');
var avatars = require('gitter-web-avatars');
var roomNameShortener = require('../room-name-shortener');
var parseRoomItemName = require('../get-org-menu-state-name-from-troupe-name');

var clientEnv = require('gitter-client-env');


module.exports = function parseContentToTemplateData(data, state) {
  data.name = (data.name || data.uri || '');
  if(data.fromUser) {
    data.name = data.fromUser.username;
  }

  if(data.isSuggestion) {
    data.uri = urlJoin(data.uri, '?source=suggested-menu');
  }

  //This is a dirty hack to provide avatar for one-to-one avatars
  //as the troupe serializer has no way of deriving them
  if(data.oneToOne) {
    data.avatarUrl = avatars.getForUser(data.user);
  }

  if(data.avatar_url) {
    data.avatarUrl = data.avatar_url;
  }

  data.absoluteRoomUri = urlJoin(clientEnv.basePath, (data.uri || data.url));

  //For user results
  if (data.displayName) {
    return _.extend({}, {
      name:         roomNameShortener(data.displayName),
      avatarUrl: avatars.getForUser(data),
      absoluteRoomUri: data.absoluteRoomUri
    });
  }

  if(data.isRecentSearch || data.isSearchRepoResult) {
    var avatarUrl = avatars.getForGitHubUsername(data.name);
    // No avatars on recent searches
    if(data.isRecentSearch) {
      avatarUrl = null;
    }

    return _.extend({}, {
      name: roomNameShortener(data.name),
      avatarUrl: avatarUrl
    });
  }

  var hasMentions = !!data.mentions && data.mentions;
  var unreadItems = !hasMentions && data.unreadItems;

  // Make sure we are lurking and we only have activity so we don't override mentions or unread indicators
  var lurkActivity = !!data.activity && (!hasMentions && !unreadItems);

  var roomName = data.name;
  // Get rid of the org prefix, if viewing in a org bucket
  if(state === 'org') {
    roomName = parseRoomItemName(data.name);
  }

  var namePieces = roomName.split('/');

  return _.extend({}, data, {
    isNotOneToOne: (data.githubType !== 'ONETOONE'),
    name: roomName,
    namePieces: namePieces,
    mentions: hasMentions,
    unreadItems: unreadItems,
    lurkActivity: lurkActivity,
    isSearch: (state === 'search'),
  });
};
