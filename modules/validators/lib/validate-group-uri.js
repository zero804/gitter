'use strict';

var validateRoomName = require('./validate-room-name');
var reservedNamespaces = require('./reserved-namespaces');

var reservedNamespaceHash = reservedNamespaces.reduce(function(memo, name) {
  memo[name.toLowerCase()] = true;
  return memo;
}, {});

function validateGroupName(name) {
  if (typeof name !== 'string') return false;

  if (reservedNamespaceHash[name.toLowerCase()]) {
    return false;
  }

  return validateRoomName(name);
}

module.exports = validateGroupName;
