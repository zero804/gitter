"use strict";

var crypto = require('crypto');

function hashEmail(email) {
  return crypto.createHash('md5').update(email).digest('hex');
}

function forEmail(email, size) {
  var checksum = crypto.createHash('md5').update(email).digest('hex');
  return forChecksum(checksum, size);
}

function forChecksum(checksum, size) {
  if (size) {
    return 'https://secure.gravatar.com/avatar/' + checksum + '?s=' + size;
  } else {
    return 'https://secure.gravatar.com/avatar/' + checksum;
  }
}

module.exports = {
  hashEmail: hashEmail,
  forEmail: forEmail,
  forChecksum: forChecksum
}
