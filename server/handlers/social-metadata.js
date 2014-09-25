/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');

function getMetadata(options) {
  var roomName = options && options.roomName;
  var owner = roomName && roomName.split('/')[0];

  var title = roomName || 'Gitter';
  var image = 'https://avatars.githubusercontent.com/' + ( owner || 'gitterHQ' );

  return {
    'og:title': title,
    'og:description': 'Where developers come to talk.',
    'og:type': 'website',
    'og:image': image,
    'fb:app_id': nconf.get('facebook:app-id'),
    'twitter:card': 'summary',
    'twitter:site': '@gitterHQ',
    'twitter:title': title,
    'twitter:description': 'Where developers come to talk.',
    'twitter:image': image
  };
}

module.exports.getMetadata = getMetadata;
