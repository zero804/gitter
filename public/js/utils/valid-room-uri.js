'use strict';

var RESERVED_RE = new RegExp('^\/(' + require('./vanity-keywords').join('|') + ')');

module.exports = function (name) {
  if (RESERVED_RE.test(name)) { return false; }
  return true;
};
