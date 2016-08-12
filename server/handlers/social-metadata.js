"use strict";

var env = require('gitter-web-env');
var nconf = env.config;
var avatars = require('gitter-web-avatars');

function getMetadata(options) {
  var room = options && options.room;

  var title = room && room.uri || 'Gitter';
  var description = room && room.topic || 'Where developers come to talk.';
  var imageUrl = room && room.avatarUrl || avatars.getDefault();

  return {
    'og:title': title,
    'og:description': description,
    'og:type': 'website',
    'og:image': imageUrl,
    'fb:app_id': nconf.get('facebook:app-id'),
    'twitter:card': 'summary',
    'twitter:site': '@gitchat',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': imageUrl
  };
}

function getMetadataForChatPermalink(options) {
  var room = options && options.room;
  var chat = options && options.chat;

  if (!chat || !chat.fromUser) return getMetadata(options);

  var fromUser = chat.fromUser;

  var title = room && room.uri || 'Gitter';
  var description = '@' + fromUser.username + ': ' + chat.text;
  var imageUrl = room && room.avatarUrl || avatars.getDefault();

  return {
    'og:title': title,
    'og:description': description,
    'og:type': 'website',
    'og:image': imageUrl,
    'fb:app_id': nconf.get('facebook:app-id'),
    'twitter:card': 'summary',
    'twitter:site': '@gitchat',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': imageUrl
  };
}

module.exports = {
  getMetadata: getMetadata,
  getMetadataForChatPermalink: getMetadataForChatPermalink
};
