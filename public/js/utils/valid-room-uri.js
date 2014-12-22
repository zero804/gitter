'use strict';

var RESERVED_RE = new RegExp('^\\/\\b(' + require('./vanity-keywords').join('|') + ')\\b');

module.exports = function (name) {
  if (!name) return false;
  if (RESERVED_RE.test(name)) { return false; }
  if (/\/archives\/(all|\d{4}\/\d{2}\/\d{2})/.test(name)) { return false; }
  return /\/[^]+/.test(name);
};
