/* eslint complexity: ["error", 15] */
'use strict';

var urlJoin = require('url-join');
var clientEnv = require('gitter-client-env');

module.exports = function parseContentToTemplateData(data) {
  // TODO: Fix absolute UR
  var absoluteRoomUrl = urlJoin(clientEnv.basePath, 'topics', data.slug);

  return {
    name: data.name,
    slug: data.slug,
    absoluteRoomUrl: absoluteRoomUrl
  };
};
