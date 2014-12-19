'use strict';

var RESERVED_RE = new RegExp('^\/(' + require('./vanity-keywords').join('|') + ')');

module.exports = function (name) {
  if (RESERVED_RE.test(name)) { return false; }
  if (/\/archives\/(all|\d{4}\/\d{2}\/\d{2})/.test(name)) { return false; }
  return true;
};
