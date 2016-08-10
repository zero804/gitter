"use strict";

var env = require('gitter-web-env');
var nconf = env.config;

var METADATA_IMAGE_SIZE = 256;

function getMetadata(options) {
  var room = options && options.room;

  var title = room && room.uri || 'Gitter';
  var description = room && room.topic || 'Where developers come to talk.';

  return {
    'og:title': title,
    'og:description': description,
    'og:type': 'website',
    'og:image': room.avatarUrl,
    'fb:app_id': nconf.get('facebook:app-id'),
    'twitter:card': 'summary',
    'twitter:site': '@gitchat',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': room.avatarUrl
  };
}

module.exports.getMetadata = getMetadata;

function getMetadataForChatPermalink(options) {
  var room = options && options.room;
  var chat = options && options.chat;

  if (!chat || !chat.fromUser) return getMetadata(options);

  var fromUser = chat.fromUser;

  var title = room && room.uri || 'Gitter';
  var description = '@' + fromUser.username + ': ' + chat.text;

  return {
    'og:title': title,
    'og:description': description,
    'og:type': 'website',
    'og:image': room.avatarUrl,
    'fb:app_id': nconf.get('facebook:app-id'),
    'twitter:card': 'summary',
    'twitter:site': '@gitchat',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': room.avatarUrl
  };
}

module.exports.getMetadataForChatPermalink = getMetadataForChatPermalink;
