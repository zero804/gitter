'use strict';

var validateRoomName = require('./validate-room-name');
var reservedNamespaces = require('./reserved-namespaces');

var reservedNamespaceHash = reservedNamespaces.reduce(function(memo, name) {
  memo[name.toLowerCase()] = true;
  return memo;
}, {});

function validateGroupUri(uri) {
  if (typeof uri !== 'string') return false;

  if (reservedNamespaceHash[uri.toLowerCase()]) {
    return false;
  }

  return validateRoomName(uri);
}

module.exports = validateGroupUri;
