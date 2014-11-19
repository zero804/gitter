'use strict';
var BASE = 'https://avatars';
var GITHUB_URL = '.githubusercontent.com/';

function hash(spec) {
  var str = spec.str || '';
  var buckets = spec.buckets || 8; // defaults to 7 buckets
  if (!str) return str;

  return str
    .trim()
    .split('')
    .reduce(function (fold, c) {
      fold += c.charCodeAt();
      return fold;
    }, 0) % buckets; // the number of buckets from 0 to (buckets - 1)
}

function getPixelDensity() {
  if (typeof window !== 'undefined') {
    return window.devicePixelRatio || 1;
  }
  return 1;
}

// make sure to pass the size for non-retina screens
module.exports = function (spec) {
  // some defaults
  var version = spec.version || 3;
  var username = spec.username || 'default';
  var size = (spec.size || 30) * getPixelDensity();

  return BASE + hash({ str: username}) + GITHUB_URL + username + '?v=' + version + '&s=' + size;
};
