'use strict';

var urlJoin = require('url-join');
var clientEnv = require('gitter-client-env');

module.exports = function parseContentToTemplateData(data) {
  var uri = urlJoin(data.groupUri, 'topics/categories', data.slug);
  var absoluteRoomUrl = urlJoin(clientEnv.basePath, uri);

  return {
    id: data.id || data._id,
    name: data.name,
    slug: data.slug,
    groupUri: data.groupUri,
    uri: uri,
    url: '/' + uri,
    absoluteRoomUrl: absoluteRoomUrl
  };
};
