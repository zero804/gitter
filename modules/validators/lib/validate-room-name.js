'use strict';

var xregexp = require('xregexp').XRegExp;

function validateRoomName(name) {
  var matcher = xregexp('^[\\p{L}\\d\\_][\\p{L}\\d\\-\\_]{1,80}$');
  return !!matcher.test(name);
}

module.exports = validateRoomName;