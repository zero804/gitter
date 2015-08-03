/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');

function getMetadata(options) {
  var room = options && options.room;

  var owner = room && room.uri && room.uri.split('/')[0];
  var image = 'https://avatars.githubusercontent.com/' + ( owner || 'gitterHQ' );

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

  var image = fromUser.avatarUrlSmall || 'https://avatars.githubusercontent.com/gitterHQ';

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
