'use strict';

var _                 = require('underscore');
var getRoomAvatar     = require('../avatars/get-room-avatar');
var roomNameShortener = require('../room-name-shortener');

module.exports = function parseContentToTemplateData(data, state) {

    data.url  = (data.url || '');
    data.name = (data.name || '');

    //For user results
    if (data.displayName) {
      return _.extend({}, { name: data.displayName, avatarUrl: data.avatarUrlSmall });
    }

    var hasMentions  = !!data.mentions && data.mentions;
    var unreadItems  = !hasMentions && data.unreadItems;
    var lurkActivity = data.lurk && (!hasMentions && !unreadItems) && !!data.activity;

    return _.extend({}, data, {
      avatarUrl: getRoomAvatar(data.url.substring(1)),
      isNotOneToOne: (data.githubType !== 'ONETOONE'),
      name:          roomNameShortener(data.name),
      mentions:      hasMentions,
      unreadItems:   unreadItems,
      lurkActivity:  lurkActivity,
      isSearch:      (state === 'search'),
    });
};
