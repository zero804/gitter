/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

function getMetadata(options) {
  var roomName = options && options.roomName;
  var owner = roomName && roomName.split('/')[0];

  var title = roomName || 'Gitter';
  var image = 'https://avatars.githubusercontent.com/' + ( owner || 'gitterHQ' );

  return {
    'og:title': title,
    'og:description': 'Where developers come to talk.',
    'og:type': roomName ? 'gitterim:room' : 'website',
    'og:image': image,
    'twitter:card': 'summary',
    'twitter:site': '@gitterHQ',
    'twitter:title': title,
    'twitter:description': 'Where developers come to talk.',
    'twitter:image': image
  };
}

module.exports.getMetadata = getMetadata;
