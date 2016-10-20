"use strict";

var assert = require('assert');

function assertStringifiedEqual(value, expected) {
  assert.strictEqual(
    JSON.stringify(value, null, '  '),
    JSON.stringify(expected, null, '  '));
}

module.exports = assertStringifiedEqual;
