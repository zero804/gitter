'use strict';

var sanitizer = require('sanitizer');

function uriPolicy(uri) {
  return uri;
}

module.exports = {
  sanitize: function(html) {
    return sanitizer.sanitize(html, uriPolicy);
  }
};
