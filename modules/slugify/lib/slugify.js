'use strict';

var slug = require('slug');

function slugify(text) {
  if (!text.toString) return '';
  return slug(text).toLowerCase();
}

module.exports = slugify;
