'use strict';

var _                        = require('underscore');
var escapeStringRegexp       = require('escape-string-regexp');
var urlJoin                  = require('url-join');
var resolveRoomAvatarSrcSet  = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var roomNameShortener        = require('../room-name-shortener');
var getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');

var clientEnv = require('gitter-client-env');

var AVATAR_SIZE = 22;

module.exports = function parseContentToTemplateData(data, state) {
  data.name = (data.name || data.uri || '');
  data.absoluteRoomUri = urlJoin(clientEnv.basePath, data.uri);

  //For user results
  if (data.displayName) {
    return _.extend({}, {
      name:         roomNameShortener(data.displayName),
      avatarSrcset: resolveRoomAvatarSrcSet({ uri: data.username }, AVATAR_SIZE),
    });
  }

  if(data.isSearchRepoResult) {
    var avatarSrcset = resolveRoomAvatarSrcSet({ uri: data.name }, AVATAR_SIZE);
    return _.extend({}, {
      name:         roomNameShortener(data.name),
      avatarSrcset: avatarSrcset,
    });
  }

  var hasMentions  = !!data.mentions && data.mentions;
  var unreadItems  = !hasMentions && data.unreadItems;
  var lurkActivity = data.lurk && (!hasMentions && !unreadItems) && !!data.activity;

  var roomName = data.name;
  // Get rid of the org prefix, if viewing in a org bucket
  if(state === 'org') {
    roomName = data.name.replace(new RegExp('^' + escapeStringRegexp(getOrgNameFromTroupeName(data.name)) + '/'), '');
  }

  var uri = data.uri || (data.url || '').substring(1);
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
