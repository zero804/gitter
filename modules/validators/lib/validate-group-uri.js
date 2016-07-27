'use strict';

var validateRoomName = require('./validate-room-name');
var reservedNamespaceHash = require('./reserved-namespaces').hash;
var xregexp = require('xregexp').XRegExp;

function validateGroupUri(uri) {
  if (typeof uri !== 'string') return false;

  // prevent groups called "login" and stuff like that
  if (reservedNamespaceHash[uri.toLowerCase()]) {
    return false;
  }

  // based on the room name regex
  var matcher = xregexp('^[\\p{L}\\d\\_][\\p{L}\\d\\-\\_]{1,80}$');
  return !!matcher.test(uri);
}

module.exports = validateGroupUri;
