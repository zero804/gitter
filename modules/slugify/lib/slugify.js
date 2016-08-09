'use strict';

var slug = require('slug');

function slugify(text) {
  return slug(text).toLowerCase();
}

module.exports = slugify;
