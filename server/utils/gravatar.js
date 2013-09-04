/*jshint node:true */
"use strict";

var crypto = require('crypto');

exports.gravatarUrlForEmail = function(email) {
  return "https://www.gravatar.com/avatar/" + crypto.createHash('md5').update(email).digest('hex') + "?d=identicon";
};