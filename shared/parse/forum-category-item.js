/* eslint complexity: ["error", 15] */
'use strict';

var urlJoin = require('url-join');
var clientEnv = require('gitter-client-env');

module.exports = function parseContentToTemplateData(data) {
  var absoluteRoomUrl = urlJoin(clientEnv.basePath, data.groupUri, 'topics/categories', data.slug);

  return {
    id: data.id || data._id,
    name: data.name,
    slug: data.slug,
    absoluteRoomUrl: absoluteRoomUrl
  };
};
