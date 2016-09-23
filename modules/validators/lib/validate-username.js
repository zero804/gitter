'use strict';

var validateGroupUri = require('./validate-group-uri');

function validateUsername(username) {
  // TODO: is this good enough?
  return validateGroupUri(username);
}

module.exports = validateUsername;
