'use strict';

var reservedNameSpaces = require('gitter-web-validators/lib/reserved-namespaces');
var RESERVED_RE = new RegExp('^\\/(' + reservedNameSpaces.join('|') + ')\\b');

module.exports = function (name) {
  if (!name) return false;
  if (RESERVED_RE.test(name)) { return false; }
  if (/\/archives\/(all|\d{4}\/\d{2}\/\d{2})/.test(name)) { return false; }
  if (/^\/orgs\//.test(name)) { return false; }

  // TODO: this should be
  // /[A-Za-z0-9-]/
  return /\/[^]+/.test(name);
};
