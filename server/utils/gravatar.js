"use strict";

var crypto = require('crypto');

module.exports = function(email) {
  return 'https://secure.gravatar.com/avatar/' + crypto.createHash('md5').update(email).digest('hex');
};
