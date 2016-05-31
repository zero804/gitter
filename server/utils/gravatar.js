"use strict";

var crypto = require('crypto');

var DEFAULT_SIZE = 64;

module.exports = function(email, size) {
  if (!size) size = DEFAULT_SIZE;
  return 'https://secure.gravatar.com/avatar/' + crypto.createHash('md5').update(email).digest('hex') + '?s=' + size;
};
