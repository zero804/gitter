'use strict';

var xregexp = require('xregexp').XRegExp;
var reservedSubNamespaceHash = require('./reserved-sub-namespaces').hashMap;

function validateRoomName(name) {
  // prevent rooms called "topics" and stuff like that.
  if (reservedSubNamespaceHash[name.toLowerCase()]) {
    return false;
  }

  var matcher = xregexp('^[\\p{L}\\d\\_][\\p{L}\\d\\-\\_]{1,80}$');
  return !!matcher.test(name);
}

module.exports = validateRoomName;
