'use strict';

var _                       = require('underscore');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var roomNameShortener       = require('../room-name-shortener');

module.exports = function parseContentToTemplateData(data, state) {

    data.url  = (data.url || '');
    data.name = (data.name || '');

    //For user results
    if (data.displayName) {
      return _.extend({}, {
          name:      roomNameShortener(data.displayName),
          avatarUrl: data.avatarUrlSmall
      });
    }

    if(data.isSearchRepoResult) {
      return _.extend({}, {
        name:      roomNameShortener(data.name),
        avatarUrl: data.avatar_url,
      });
    }

    var name         = data.url.substring(1);
    var hasMentions  = !!data.mentions && data.mentions;
    var unreadItems  = !hasMentions && data.unreadItems;
    var lurkActivity = data.lurk && (!hasMentions && !unreadItems) && !!data.activity;

    return _.extend({}, data, {
      avatarSrcset:  resolveRoomAvatarSrcSet({ uri: name }, 22),
      isNotOneToOne: (data.githubType !== 'ONETOONE'),
      name:          roomNameShortener(data.name),
      mentions:      hasMentions,
      unreadItems:   unreadItems,
      lurkActivity:  lurkActivity,
      isSearch:      (state === 'search'),
    });
};
