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
