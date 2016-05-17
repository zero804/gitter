'use strict';

var xregexp = require('xregexp').XRegExp;

function validateRoomName(name) {
  var matcher = xregexp('^[\\p{L}\\d][\\p{L}\\d\\-\\_]{1,24}$');
  return !!matcher.test(name);
}

module.exports = validateRoomName;
