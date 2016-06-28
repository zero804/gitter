"use strict";

var crypto = require('crypto');

var DEFAULT_SIZE = 64;

function hashEmail(email) {
  return crypto.createHash('md5').update(email).digest('hex');
}

function forEmail(email, size) {
  var checksum = crypto.createHash('md5').update(email).digest('hex');
  return forChecksum(checksum, size);
}

function forChecksum(checksum, size) {
  if (!size) size = DEFAULT_SIZE;
  return 'https://secure.gravatar.com/avatar/' + checksum + '?s=' + size;
}

module.exports = {
  hashEmail: hashEmail,
  forEmail: forEmail,
  forChecksum: forChecksum
}
