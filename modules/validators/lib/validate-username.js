'use strict';

const reservedNamespaceHash = require('./reserved-namespaces').hash;
const xregexp = require('xregexp').XRegExp;

function validateUsername(username) {
  if (typeof username !== 'string') return false;

  // prevent groups called "login" and stuff like that
  if (reservedNamespaceHash[username.toLowerCase()]) {
    return false;
  }

  // based on the room name regex
  const matcher = xregexp('^[\\p{L}\\d\\_][\\p{L}\\d\\-\\_.]{1,80}$');
  return !!matcher.test(username);
}

module.exports = validateUsername;
