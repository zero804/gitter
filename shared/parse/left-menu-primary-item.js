'use strict';

var _                        = require('underscore');
var resolveRoomAvatarSrcSet  = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var roomNameShortener        = require('../room-name-shortener');
var getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');

var AVATAR_SIZE = 22;

module.exports = function parseContentToTemplateData(data, state) {
    data.url  = (data.url || '');
    data.name = (data.name || '');

    //For user results
    if (data.displayName) {
      return _.extend({}, {
          name:         roomNameShortener(data.displayName),
          avatarSrcset: resolveRoomAvatarSrcSet({ uri: data.displayName }, AVATAR_SIZE),
      });
    }

    if(data.isSearchRepoResult) {
      var avatarSrcset = resolveRoomAvatarSrcSet({ uri: data.name }, AVATAR_SIZE);
      return _.extend({}, {
        name:         roomNameShortener(data.name),
        avatarSrcset: avatarSrcset,
      });
    }

    var name         = data.url.substring(1);
    var hasMentions  = !!data.mentions && data.mentions;
    var unreadItems  = !hasMentions && data.unreadItems;
    var lurkActivity = data.lurk && (!hasMentions && !unreadItems) && !!data.activity;

    var roomName = data.name;
    // Get rid of the org prefix, if viewing in a org bucket
    if(state === 'org') {
      roomName = data.name.replace(new RegExp('^' + getOrgNameFromTroupeName(data.name) + '/'), '');
    }

    return _.extend({}, data, {
      avatarSrcset:  resolveRoomAvatarSrcSet({ uri: name }, AVATAR_SIZE),
      isNotOneToOne: (data.githubType !== 'ONETOONE'),
      name:          roomNameShortener(roomName),
      mentions:      hasMentions,
      unreadItems:   unreadItems,
      lurkActivity:  lurkActivity,
      isSearch:      (state === 'search'),
    });
};
