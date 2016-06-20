'use strict';

var clientEnv = require('gitter-client-env');
var baseUrl = clientEnv.avatarsUrl;

module.exports = function resolveUserAvatarUrl(groupId, size) {
  var url = baseUrl + 'group/i/' + groupId;
  if (size) {
    url = url + '?s=' + size;
  }
  return url;
};
