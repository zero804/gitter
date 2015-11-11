"use strict";

var nconf = require('../utils/config');
var resolveAvatarUrl = require('gitter-web-shared/avatars/resolve-avatar-url');
var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-avatar-url');

var METADATA_IMAGE_SIZE = 256;

function getMetadata(options) {
  var room = options && options.room;

  var image = resolveRoomAvatarUrl(room && room.uri || 'gitterHQ', METADATA_IMAGE_SIZE);

  var title = room && room.uri || 'Gitter';
  var description = room && room.topic || 'Where developers come to talk.';

  return {
    'og:title': title,
    'og:description': description,
    'og:type': 'website',
    'og:image': image,
    'fb:app_id': nconf.get('facebook:app-id'),
    'twitter:card': 'summary',
    'twitter:site': '@gitchat',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': image
  };
}

module.exports.getMetadata = getMetadata;

function getMetadataForChatPermalink(options) {
  var room = options && options.room;
  var chat = options && options.chat;

  if (!chat || !chat.fromUser) return getMetadata(options);

  var fromUser = chat.fromUser;

  var image = resolveAvatarUrl({ username: fromUser, size: METADATA_IMAGE_SIZE });

  var title = room && room.uri || 'Gitter';
  var description = '@' + fromUser.username + ': ' + chat.text;

  return {
    'og:title': title,
    'og:description': description,
    'og:type': 'website',
    'og:image': image,
    'fb:app_id': nconf.get('facebook:app-id'),
    'twitter:card': 'summary',
    'twitter:site': '@gitchat',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': image
  };
}

module.exports.getMetadataForChatPermalink = getMetadataForChatPermalink;
